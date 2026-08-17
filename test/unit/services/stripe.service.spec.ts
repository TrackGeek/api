import { of, throwError } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StripeService } from "@/modules/payment/service/stripe.service";
import { DEFAULT_CURRENCY } from "@/shared/constants/payment";
import type { ClientIpType } from "@/shared/decorators/client-ip.decorator";

const mockHttpGet = vi.fn();
const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();

const mockConfigService = { get: vi.fn().mockReturnValue("sk_test_fake") };
const mockHttpService = { get: mockHttpGet };
const mockCacheService = { get: mockCacheGet, set: mockCacheSet };

const publicIp: ClientIpType = { address: "8.8.8.8", isLocal: false };

function buildService(): StripeService {
  return new StripeService(
    mockConfigService as any,
    {} as any,
    {} as any,
    {} as any,
    mockHttpService as any,
    mockCacheService as any,
  );
}

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
