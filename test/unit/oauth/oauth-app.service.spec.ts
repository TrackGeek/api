import { describe, expect, it, vi } from "vitest";
import { OAuthAppService } from "@/modules/oauth/service/oauth-app.service";

function setup(owner = "owner") {
  const transaction = {
    oAuthConsent: {
      findFirst: vi.fn(async ({ where }) =>
        where.userId === owner && where.clientId === "client" ? { id: "consent" } : null,
      ),
      deleteMany: vi.fn(),
    },
    oAuthAccessToken: { deleteMany: vi.fn() },
    oAuthRefreshToken: { deleteMany: vi.fn() },
    oAuthRevocation: { upsert: vi.fn() },
  };
  const database = { $transaction: vi.fn(async (callback) => callback(transaction)) };
  return { service: new OAuthAppService(database as any), transaction };
}

describe("Authorized application revocation", () => {
  it("revokes only the connected user's grant and deletes refresh credentials atomically", async () => {
    const { service, transaction } = setup();
    await service.revoke("owner", "client");
    const where = { userId: "owner", clientId: "client" };
    expect(transaction.oAuthRevocation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId_clientId: where }, create: { ...where, revokedAt: expect.any(Date) } }),
    );
    expect(transaction.oAuthAccessToken.deleteMany).toHaveBeenCalledWith({ where });
    expect(transaction.oAuthRefreshToken.deleteMany).toHaveBeenCalledWith({ where });
    expect(transaction.oAuthConsent.deleteMany).toHaveBeenCalledWith({ where });
  });

  it("does not revoke another user's application connection", async () => {
    const { service, transaction } = setup("victim");
    await service.revoke("attacker", "client");
    expect(transaction.oAuthRevocation.upsert).not.toHaveBeenCalled();
    expect(transaction.oAuthRefreshToken.deleteMany).not.toHaveBeenCalled();
    expect(transaction.oAuthConsent.deleteMany).not.toHaveBeenCalled();
  });
});
