import { faker } from "@faker-js/faker";
import { CoinReason, CosmeticType } from "@prisma/generated/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CosmeticService } from "@/modules/cosmetic/service/cosmetic.service";
import { AppException } from "@/shared/exceptions/app.exceptions";

const mockUserXpFindUnique = vi.fn();
const mockUserMissionFindMany = vi.fn();
const mockUserCosmeticFindMany = vi.fn();
const mockUserCosmeticFindUnique = vi.fn();
const mockUserCosmeticCreate = vi.fn();
const mockProfileFindUnique = vi.fn();

const tx = {
  userCosmetic: { create: mockUserCosmeticCreate },
};

const mockDatabaseService = {
  $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  userXp: { findUnique: mockUserXpFindUnique },
  userMission: { findMany: mockUserMissionFindMany },
  userCosmetic: { findMany: mockUserCosmeticFindMany, findUnique: mockUserCosmeticFindUnique },
  profile: { findUnique: mockProfileFindUnique },
};

const mockSpendCoins = vi.fn();
const mockGetWalletByUserId = vi.fn();

const mockCoinService = {
  spendCoins: mockSpendCoins,
  getWalletByUserId: mockGetWalletByUserId,
};

describe("CosmeticService", () => {
  let service: CosmeticService;
  let userId: string;

  beforeEach(() => {
    vi.clearAllMocks();

    userId = faker.string.uuid();
    service = new CosmeticService(mockDatabaseService as any, mockCoinService as any);

    mockUserXpFindUnique.mockResolvedValue(null);
    mockUserMissionFindMany.mockResolvedValue([]);
    mockUserCosmeticFindMany.mockResolvedValue([]);
    mockProfileFindUnique.mockResolvedValue(null);
  });

  it("item comprado aparece destravado e possuído no catálogo", async () => {
    mockUserCosmeticFindMany.mockResolvedValue([{ type: CosmeticType.AvatarFrame, key: "glow" }]);

    const catalog = await service.getCatalog(userId);

    const glow = catalog.avatarFrames.find((item) => item.key === "glow");
    const neon = catalog.avatarFrames.find((item) => item.key === "neon");

    expect(glow).toMatchObject({ unlocked: true, owned: true });
    expect(neon).toMatchObject({ unlocked: false, owned: false });
  });

  it("catálogo marca o cosmético equipado no perfil", async () => {
    mockProfileFindUnique.mockResolvedValue({
      color: "#10b981",
      avatarFrame: null,
      title: "collector",
      bannerEffect: null,
    });

    const catalog = await service.getCatalog(userId);

    expect(catalog.profileColors.find((item) => item.key === "emerald")).toMatchObject({ equipped: true });
    expect(catalog.profileTitles.find((item) => item.key === "collector")).toMatchObject({ equipped: true });
    expect(catalog.avatarFrames.find((item) => item.key === "none")).toMatchObject({ equipped: true });
  });

  it("cores de missão ficam livres no catálogo sem missão completa", async () => {
    const catalog = await service.getCatalog(userId);

    expect(catalog.profileColors.find((item) => item.key === "otaku")).toMatchObject({ unlocked: true });
    expect(catalog.profileColors.find((item) => item.key === "dusk")).toMatchObject({ unlocked: false });
  });

  it("assertProfileColorUnlocked aceita qualquer hex custom", async () => {
    await expect(service.assertProfileColorUnlocked(userId, faker.color.rgb())).resolves.toBeUndefined();
  });

  it("assertProfileColorUnlocked rejeita string que não é hex nem gradiente", async () => {
    await expect(service.assertProfileColorUnlocked(userId, faker.string.alphanumeric(10))).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it("assertProfileColorUnlocked rejeita gradiente não possuído", async () => {
    await expect(service.assertProfileColorUnlocked(userId, "gradient:dusk")).rejects.toBeInstanceOf(AppException);
  });

  it("assertProfileColorUnlocked aceita gradiente possuído", async () => {
    mockUserCosmeticFindMany.mockResolvedValue([{ type: CosmeticType.ProfileColor, key: "dusk" }]);

    await expect(service.assertProfileColorUnlocked(userId, "gradient:dusk")).resolves.toBeUndefined();
  });

  it("compra de gradiente debita o preço do catálogo", async () => {
    mockUserCosmeticFindUnique.mockResolvedValue(null);
    mockSpendCoins.mockResolvedValue({ amount: 200, balance: 0 });
    mockGetWalletByUserId.mockResolvedValue({ balance: 0, lifetimeEarned: 200, lifetimeSpent: 200 });

    await service.purchaseCosmetic(userId, { type: CosmeticType.ProfileColor, key: "dusk" });

    expect(mockSpendCoins).toHaveBeenCalledWith(expect.objectContaining({ amount: 200 }), tx);
    expect(mockUserCosmeticCreate).toHaveBeenCalledWith({
      data: { userId, type: CosmeticType.ProfileColor, key: "dusk" },
    });
  });

  it("assertCosmeticUnlocked rejeita key fora do catálogo", async () => {
    await expect(
      service.assertCosmeticUnlocked(userId, CosmeticType.AvatarFrame, faker.string.alphanumeric(10)),
    ).rejects.toBeInstanceOf(AppException);
  });

  it("assertCosmeticUnlocked rejeita item comprável não possuído", async () => {
    await expect(service.assertCosmeticUnlocked(userId, CosmeticType.ProfileTitle, "legend")).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it("assertCosmeticUnlocked aceita item possuído", async () => {
    mockUserCosmeticFindMany.mockResolvedValue([{ type: CosmeticType.ProfileTitle, key: "legend" }]);

    await expect(service.assertCosmeticUnlocked(userId, CosmeticType.ProfileTitle, "legend")).resolves.toBeUndefined();
  });

  it("assertCosmeticUnlocked sempre aceita none", async () => {
    await expect(service.assertCosmeticUnlocked(userId, CosmeticType.BannerEffect, "none")).resolves.toBeUndefined();
  });

  it("não vende item que não é de compra", async () => {
    await expect(
      service.purchaseCosmetic(userId, { type: CosmeticType.ProfileColor, key: "emerald" }),
    ).rejects.toBeInstanceOf(AppException);

    expect(mockSpendCoins).not.toHaveBeenCalled();
  });

  it("não vende item já possuído", async () => {
    mockUserCosmeticFindUnique.mockResolvedValue({ id: faker.string.uuid() });

    await expect(
      service.purchaseCosmetic(userId, { type: CosmeticType.AvatarFrame, key: "glow" }),
    ).rejects.toBeInstanceOf(AppException);

    expect(mockSpendCoins).not.toHaveBeenCalled();
  });

  it("compra debita o preço do catálogo e grava o inventário na mesma transação", async () => {
    mockUserCosmeticFindUnique.mockResolvedValue(null);
    mockSpendCoins.mockResolvedValue({ amount: 100, balance: 50 });
    mockGetWalletByUserId.mockResolvedValue({ balance: 50, lifetimeEarned: 150, lifetimeSpent: 100 });

    const result = await service.purchaseCosmetic(userId, { type: CosmeticType.AvatarFrame, key: "glow" });

    expect(mockSpendCoins).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        reason: CoinReason.Purchase,
        sourceKey: `purchase:${CosmeticType.AvatarFrame}:glow`,
        amount: 100,
      }),
      tx,
    );
    expect(mockUserCosmeticCreate).toHaveBeenCalledWith({
      data: { userId, type: CosmeticType.AvatarFrame, key: "glow" },
    });
    expect(result.wallet.balance).toBe(50);
    expect(result.cosmetic).toMatchObject({ key: "glow", owned: true, unlocked: true });
  });

  it("corrida perdida no sourceKey vira já possuído", async () => {
    mockUserCosmeticFindUnique.mockResolvedValue(null);
    mockSpendCoins.mockResolvedValue(null);

    await expect(
      service.purchaseCosmetic(userId, { type: CosmeticType.AvatarFrame, key: "glow" }),
    ).rejects.toBeInstanceOf(AppException);

    expect(mockUserCosmeticCreate).not.toHaveBeenCalled();
  });
});
