import { of, throwError } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StripeController } from "@/modules/payment/controller/stripe.controller";
import { PaymentService } from "@/modules/payment/service/payment.service";
import { StripeService } from "@/modules/payment/service/stripe.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { DEFAULT_CURRENCY } from "@/shared/constants/payment";
import type { ClientIpType } from "@/shared/decorators/client-ip.decorator";

const mockHttpGet = vi.fn();
const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();

const mockConfigService = { get: vi.fn().mockReturnValue("sk_test_fake") };
const mockHttpService = { get: mockHttpGet };
const mockCacheService = { get: mockCacheGet, set: mockCacheSet };

const publicIp: ClientIpType = { address: "8.8.8.8", isLocal: false };

function buildService(databaseService: Record<string, unknown> = {}): StripeService {
  return new StripeService(
    mockConfigService as any,
    databaseService as any,
    {} as any,
    {} as any,
    mockHttpService as any,
    mockCacheService as any,
  );
}

describe("StripeService optional configuration", () => {
  it.each([undefined, "", "   "])("starts without a usable key (%j) and returns no prices", async (key) => {
    mockConfigService.get.mockReturnValueOnce(key);
    const service = buildService();
    const client = vi.spyOn(service, "client", "get");

    await expect(service.getPrices(publicIp)).resolves.toEqual([]);
    expect(client).not.toHaveBeenCalled();
    expect(() => service.client).toThrow(expect.objectContaining({ status: 503 }));
  });

  it("keeps Stripe available when a key is configured", () => {
    expect(buildService().client.checkout.sessions.create).toBeTypeOf("function");
  });

  it("allows subscription lookup and account deletion without a Stripe customer", async () => {
    mockConfigService.get.mockReturnValueOnce(undefined);
    const service = buildService({ user: { findUnique: vi.fn().mockResolvedValue({ stripeCustomerId: null }) } });

    await expect(service.getCurrentSubscription("user_1")).resolves.toBeNull();
    await expect(service.cancelSubscriptionsForAccountDeletion(null)).resolves.toBeUndefined();
  });

  it("rejects checkout before reading or changing database records when disabled", async () => {
    mockConfigService.get.mockReturnValueOnce(undefined);
    const findUnique = vi.fn();
    const payment = new PaymentService(buildService(), {} as any, { user: { findUnique } } as any);

    await expect(payment.createPayment({ userId: "user_1" } as any)).rejects.toMatchObject({
      status: 503,
      response: { code: ERROR_CODES.STRIPE_NOT_CONFIGURED },
    });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("reports unavailable Stripe for webhooks without attempting signature verification", async () => {
    mockConfigService.get.mockReturnValueOnce(undefined);
    const controller = new StripeController(buildService(), mockConfigService as any);

    await expect(controller.webhook({ rawBody: Buffer.from("{}") } as any, "signature")).rejects.toMatchObject({
      status: 503,
      response: { code: ERROR_CODES.STRIPE_NOT_CONFIGURED },
    });
  });

  it("requires a webhook secret only for webhook requests", async () => {
    const service = buildService();
    const constructEvent = vi.fn();
    vi.spyOn(service, "client", "get").mockReturnValue({ webhooks: { constructEvent } } as any);
    const controller = new StripeController(service, { get: vi.fn().mockReturnValue("") } as any);

    await expect(controller.webhook({ rawBody: Buffer.from("{}") } as any, "signature")).rejects.toMatchObject({
      status: 503,
    });
    expect(constructEvent).not.toHaveBeenCalled();
  });
});

describe("StripeService.getUserCurrency", () => {
  let service: StripeService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheGet.mockResolvedValue(null);
    mockCacheSet.mockResolvedValue(undefined);
    service = buildService();
  });

  it("maps the country code from the first provider to a currency", async () => {
    mockHttpGet.mockReturnValueOnce(of({ data: { success: true, country_code: "BR" } }));

    await expect(service.getUserCurrency(publicIp)).resolves.toBe("brl");
    expect(mockHttpGet).toHaveBeenCalledTimes(1);
    expect(mockHttpGet.mock.calls[0][0]).toContain("ipwho.is");
  });

  it("falls back to the second provider when the first throws", async () => {
    mockHttpGet
      .mockReturnValueOnce(throwError(() => new Error("rate limited")))
      .mockReturnValueOnce(of({ data: { countryCode: "JP" } }));

    await expect(service.getUserCurrency(publicIp)).resolves.toBe("jpy");
    expect(mockHttpGet).toHaveBeenCalledTimes(2);
    expect(mockHttpGet.mock.calls[1][0]).toContain("freeipapi.com");
  });

  it("falls back when the first provider answers with success:false", async () => {
    mockHttpGet
      .mockReturnValueOnce(of({ data: { success: false, message: "reserved range" } }))
      .mockReturnValueOnce(of({ data: { countryCode: "GB" } }));

    await expect(service.getUserCurrency(publicIp)).resolves.toBe("gbp");
  });

  it("returns the default currency and short-caches it when every provider fails", async () => {
    mockHttpGet.mockReturnValue(throwError(() => new Error("down")));

    await expect(service.getUserCurrency(publicIp)).resolves.toBe(DEFAULT_CURRENCY);
    expect(mockCacheSet).toHaveBeenCalledWith("currency:ip:8.8.8.8", DEFAULT_CURRENCY, 300);
  });

  it("serves a cached currency without calling any provider", async () => {
    mockCacheGet.mockResolvedValueOnce("brl");

    await expect(service.getUserCurrency(publicIp)).resolves.toBe("brl");
    expect(mockHttpGet).not.toHaveBeenCalled();
  });

  it("skips lookup entirely for a local ip", async () => {
    await expect(service.getUserCurrency({ address: "172.17.0.1", isLocal: true })).resolves.toBe(DEFAULT_CURRENCY);
    expect(mockHttpGet).not.toHaveBeenCalled();
    expect(mockCacheGet).not.toHaveBeenCalled();
  });

  it("skips lookup when no client ip is available", async () => {
    await expect(service.getUserCurrency(undefined)).resolves.toBe(DEFAULT_CURRENCY);
    expect(mockHttpGet).not.toHaveBeenCalled();
  });

  it("caches a resolved currency for the full expiration", async () => {
    mockHttpGet.mockReturnValueOnce(of({ data: { success: true, country_code: "US" } }));

    await service.getUserCurrency(publicIp);

    expect(mockCacheSet).toHaveBeenCalledWith("currency:ip:8.8.8.8", "usd", 3600 * 24);
  });

  it("falls back to the default currency for an unknown country code", async () => {
    mockHttpGet.mockReturnValueOnce(of({ data: { success: true, country_code: "ZZ" } }));

    await expect(service.getUserCurrency(publicIp)).resolves.toBe(DEFAULT_CURRENCY);
  });
});

describe("StripeService.cancelSubscriptionsForAccountDeletion", () => {
  it("cancels every billable subscription and skips terminal subscriptions", async () => {
    const service = buildService();
    const cancel = vi.fn().mockResolvedValue({});
    const list = vi.fn().mockReturnValue(
      (async function* () {
        yield { id: "active", status: "active" };
        yield { id: "trial", status: "trialing" };
        yield { id: "past-due", status: "past_due" };
        yield { id: "cancelled", status: "canceled" };
        yield { id: "expired", status: "incomplete_expired" };
      })(),
    );
    vi.spyOn(service, "client", "get").mockReturnValue({ subscriptions: { list, cancel } } as any);
    await service.cancelSubscriptionsForAccountDeletion("cus_1");
    expect(cancel.mock.calls.map(([id]) => id)).toEqual(["active", "trial", "past-due"]);
    expect(list).toHaveBeenCalledWith({ customer: "cus_1", status: "all", limit: 100 });
  });

  it("does not contact Stripe without a customer", async () => {
    const service = buildService();
    const list = vi.fn();
    vi.spyOn(service, "client", "get").mockReturnValue({ subscriptions: { list } } as any);
    await service.cancelSubscriptionsForAccountDeletion(null);
    expect(list).not.toHaveBeenCalled();
  });
});
