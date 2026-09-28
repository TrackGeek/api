import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountInactivityService } from "@/modules/account-inactivity/account-inactivity.service";
import { addCalendarMonths } from "@/modules/account-inactivity/calendar-months";
import { UserService } from "@/modules/user/service/user.service";
import { EmailService } from "@/shared/infra/email/email.service";

const now = new Date("2026-09-27T06:00:00Z");
const inactive = {
  id: "user-1",
  name: "Test",
  email: "test@example.com",
  stripeCustomerId: "cus_1",
  lastActiveAt: new Date("2026-03-27T06:00:00Z"),
  inactivityWarnedAt: new Date("2026-08-27T06:00:00Z"),
  inactivityDeletionAt: now,
};

function setup(user = inactive) {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: user.id }]),
    user: {
      findUnique: vi.fn().mockResolvedValue(user),
      update: vi.fn().mockResolvedValue(user),
      delete: vi.fn().mockResolvedValue(user),
    },
  };
  const database = {
    $transaction: vi.fn(async (fn) => fn(tx)),
    user: { findMany: vi.fn().mockResolvedValue([]) },
  };
  const email = { sendInactivityWarningEmail: vi.fn().mockResolvedValue(undefined) };
  const stripe = { cancelSubscriptionsForAccountDeletion: vi.fn().mockResolvedValue(undefined) };
  const service = new AccountInactivityService(
    database as any,
    email as any,
    stripe as any,
    { getOrThrow: () => "https://trackgeek.net" } as any,
  );
  return { service, tx, database, email, stripe };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});
afterEach(() => vi.useRealTimers());

describe("calendar months", () => {
  it("clamps month ends and preserves UTC time", () => {
    expect(addCalendarMonths(new Date("2024-01-31T12:30:00Z"), 1).toISOString()).toBe("2024-02-29T12:30:00.000Z");
    expect(addCalendarMonths(new Date("2025-08-31T12:30:00Z"), 6).toISOString()).toBe("2026-02-28T12:30:00.000Z");
  });
});

describe("account inactivity", () => {
  it("warns at five months and gives at least one calendar month", async () => {
    const { service, tx, email } = setup({
      ...inactive,
      lastActiveAt: new Date("2026-04-27T06:00:00Z"),
      inactivityWarnedAt: null as any,
      inactivityDeletionAt: null as any,
    });
    await service.processUser(inactive.id, now);
    expect(email.sendInactivityWarningEmail).toHaveBeenCalledWith(
      expect.objectContaining({ deletionDate: "2026-10-27" }),
    );
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          inactivityWarnedAt: now,
          inactivityDeletionAt: new Date("2026-10-27T06:00:00Z"),
        },
      }),
    );
    expect(tx.user.delete).not.toHaveBeenCalled();
  });

  it("never deletes an overdue account without first sending a warning", async () => {
    const { service, tx, email } = setup({
      ...inactive,
      inactivityWarnedAt: null as any,
      inactivityDeletionAt: null as any,
    });
    await service.processUser(inactive.id, now);
    expect(email.sendInactivityWarningEmail).toHaveBeenCalledOnce();
    expect(tx.user.delete).not.toHaveBeenCalled();
  });

  it("does not record a warning when sending fails", async () => {
    const { service, tx, email } = setup({ ...inactive, inactivityWarnedAt: null as any });
    email.sendInactivityWarningEmail.mockRejectedValue(new Error("provider failed"));
    await expect(service.processUser(inactive.id, now)).rejects.toThrow("provider failed");
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.user.delete).not.toHaveBeenCalled();
  });

  it("rechecks activity after acquiring the row lock", async () => {
    const { service, tx, email, stripe } = setup({ ...inactive, lastActiveAt: now });
    await service.processUser(inactive.id, now);
    expect(tx.$queryRaw).toHaveBeenCalledOnce();
    expect(email.sendInactivityWarningEmail).not.toHaveBeenCalled();
    expect(stripe.cancelSubscriptionsForAccountDeletion).not.toHaveBeenCalled();
    expect(tx.user.delete).not.toHaveBeenCalled();
  });

  it("preserves the full notice period if the scheduler was late", async () => {
    const { service, tx } = setup({ ...inactive, inactivityWarnedAt: new Date("2026-09-01T06:00:00Z") });
    await service.processUser(inactive.id, now);
    expect(tx.user.delete).not.toHaveBeenCalled();
  });

  it("does not delete before six months even with a stale deadline", async () => {
    const { service, tx } = setup({ ...inactive, lastActiveAt: new Date("2026-04-01T06:00:00Z") });
    await service.processUser(inactive.id, now);
    expect(tx.user.delete).not.toHaveBeenCalled();
  });

  it("cancels billing before deleting and does not resend the notice", async () => {
    const { service, tx, email, stripe } = setup();
    await service.processUser(inactive.id, now);
    expect(stripe.cancelSubscriptionsForAccountDeletion).toHaveBeenCalledWith("cus_1");
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: inactive.id } });
    expect(email.sendInactivityWarningEmail).not.toHaveBeenCalled();
    expect(stripe.cancelSubscriptionsForAccountDeletion.mock.invocationCallOrder[0]).toBeLessThan(
      tx.user.delete.mock.invocationCallOrder[0],
    );
  });

  it("keeps account data when Stripe fails", async () => {
    const { service, tx, stripe } = setup();
    stripe.cancelSubscriptionsForAccountDeletion.mockRejectedValue(new Error("Stripe unavailable"));
    await expect(service.processUser(inactive.id, now)).rejects.toThrow("Stripe unavailable");
    expect(tx.user.delete).not.toHaveBeenCalled();
  });

  it("continues processing other users after a failure and requests a retry", async () => {
    const { service, database } = setup();
    database.user.findMany.mockResolvedValueOnce([{ id: "a" }, { id: "b" }] as any).mockResolvedValueOnce([]);
    const process = vi
      .spyOn(service, "processUser")
      .mockRejectedValueOnce(new Error("failed"))
      .mockResolvedValueOnce(undefined);
    await expect(service.run(now)).rejects.toThrow("1 users");
    expect(process).toHaveBeenCalledTimes(2);
    expect(database.user.findMany.mock.calls[1][0].where.id).toEqual({ gt: "b" });
  });
});

describe("activity recording", () => {
  it("clears deletion state even within the hourly write window", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const service = new UserService({ user: { updateMany } } as any, {} as any, {} as any, {} as any, {} as any);
    await service.recordActivity("user-1");
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "user-1",
        OR: [{ lastActiveAt: { lt: new Date("2026-09-27T05:00:00Z") } }, { inactivityWarnedAt: { not: null } }],
      },
      data: { lastActiveAt: now, inactivityWarnedAt: null, inactivityDeletionAt: null },
    });
  });
});

describe("inactivity email", () => {
  it("treats Resend error responses as failures", async () => {
    const send = vi.fn().mockResolvedValue({ data: null, error: { message: "rejected" } });
    const service = new EmailService({ send } as any, { getOrThrow: () => "TrackGeek <hello@example.com>" } as any);
    await expect(
      service.sendInactivityWarningEmail({
        name: "Test",
        email: "test@example.com",
        url: "https://trackgeek.net",
        deletionDate: "2026-10-27",
        idempotencyKey: "key",
      }),
    ).rejects.toThrow("rejected");
    expect(send.mock.calls[0][1]).toEqual({ idempotencyKey: "key" });
  });
});
