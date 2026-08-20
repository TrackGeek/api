import { faker } from "@faker-js/faker";
import { CoinReason } from "@prisma/generated/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CoinService } from "@/modules/coin/service/coin.service";
import { AppException } from "@/shared/exceptions/app.exceptions";

const mockCoinLedgerCreate = vi.fn();
const mockUserWalletUpsert = vi.fn();
const mockUserWalletUpdateMany = vi.fn();
const mockUserWalletFindUniqueOrThrow = vi.fn();
const mockUserWalletFindUnique = vi.fn();

const tx = {
  coinLedger: { create: mockCoinLedgerCreate },
  userWallet: {
    upsert: mockUserWalletUpsert,
    updateMany: mockUserWalletUpdateMany,
    findUniqueOrThrow: mockUserWalletFindUniqueOrThrow,
  },
};

const mockDatabaseService = {
  $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  userWallet: { findUnique: mockUserWalletFindUnique },
};

const uniqueViolation = Object.assign(new Error("unique"), { code: "P2002" });

describe("CoinService", () => {
  let service: CoinService;
  let userId: string;

  beforeEach(() => {
    vi.clearAllMocks();

    userId = faker.string.uuid();
    service = new CoinService(mockDatabaseService as any);
  });

  it("escreve no ledger e incrementa o saldo", async () => {
    const amount = faker.number.int({ min: 1, max: 500 });

    mockUserWalletUpsert.mockResolvedValueOnce({ balance: amount });

    const result = await service.grantCoins({
      userId,
      reason: CoinReason.LevelUp,
      sourceKey: "level-up:2",
      amount,
    });

    expect(result).toEqual({ amount, balance: amount });
    expect(mockUserWalletUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { balance: { increment: amount }, lifetimeEarned: { increment: amount } },
      }),
    );
  });

  it("o mesmo sourceKey paga uma vez só", async () => {
    mockUserWalletUpsert.mockResolvedValueOnce({ balance: 10 });

    const first = await service.grantCoins({
      userId,
      reason: CoinReason.MissionCompleted,
      sourceKey: "mission:1",
      amount: 10,
    });

    mockCoinLedgerCreate.mockRejectedValueOnce(uniqueViolation);

    const second = await service.grantCoins({
      userId,
      reason: CoinReason.MissionCompleted,
      sourceKey: "mission:1",
      amount: 10,
    });

    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it("recompensa zero não vira linha no ledger", async () => {
    const result = await service.grantCoins({
      userId,
      reason: CoinReason.MissionCompleted,
      sourceKey: "mission:2",
      amount: 0,
    });

    expect(result).toBeNull();
    expect(mockCoinLedgerCreate).not.toHaveBeenCalled();
  });

  it("carteira inexistente lê como zerada", async () => {
    mockUserWalletFindUnique.mockResolvedValueOnce(null);

    const wallet = await service.getWalletByUserId(userId);

    expect(wallet).toEqual({ balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 });
  });

  it("debita o saldo com linha negativa no ledger", async () => {
    const amount = faker.number.int({ min: 1, max: 500 });
    const remaining = faker.number.int({ min: 0, max: 100 });

    mockUserWalletUpdateMany.mockResolvedValueOnce({ count: 1 });
    mockUserWalletFindUniqueOrThrow.mockResolvedValueOnce({ balance: remaining });

    const result = await service.spendCoins({
      userId,
      reason: CoinReason.Purchase,
      sourceKey: "purchase:AvatarFrame:glow",
      amount,
    });

    expect(result).toEqual({ amount, balance: remaining });
    expect(mockCoinLedgerCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: -amount }) }),
    );
    expect(mockUserWalletUpdateMany).toHaveBeenCalledWith({
      where: { userId, balance: { gte: amount } },
      data: { balance: { decrement: amount }, lifetimeSpent: { increment: amount } },
    });
  });

  it("saldo insuficiente aborta sem debitar", async () => {
    mockUserWalletUpdateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      service.spendCoins({
        userId,
        reason: CoinReason.Purchase,
        sourceKey: "purchase:ProfileTitle:legend",
        amount: 400,
      }),
    ).rejects.toBeInstanceOf(AppException);

    expect(mockUserWalletFindUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("o mesmo sourceKey debita uma vez só", async () => {
    mockCoinLedgerCreate.mockRejectedValueOnce(uniqueViolation);

    const result = await service.spendCoins({
      userId,
      reason: CoinReason.Purchase,
      sourceKey: "purchase:AvatarFrame:glow",
      amount: 100,
    });

    expect(result).toBeNull();
    expect(mockUserWalletUpdateMany).not.toHaveBeenCalled();
  });

  it("débito de zero não vira linha no ledger", async () => {
    const result = await service.spendCoins({
      userId,
      reason: CoinReason.Purchase,
      sourceKey: "purchase:AvatarFrame:neon",
      amount: 0,
    });

    expect(result).toBeNull();
    expect(mockCoinLedgerCreate).not.toHaveBeenCalled();
  });

  it("usa o client de transacao recebido em vez de abrir outra", async () => {
    mockUserWalletUpdateMany.mockResolvedValueOnce({ count: 1 });
    mockUserWalletFindUniqueOrThrow.mockResolvedValueOnce({ balance: 5 });

    await service.spendCoins(
      { userId, reason: CoinReason.Purchase, sourceKey: "purchase:BannerEffect:particles", amount: 280 },
      tx as any,
    );

    expect(mockDatabaseService.$transaction).not.toHaveBeenCalled();
  });
});
