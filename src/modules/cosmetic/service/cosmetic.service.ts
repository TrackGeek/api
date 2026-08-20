import { Injectable } from "@nestjs/common";
import { CoinReason, CosmeticType } from "@prisma/generated/enums";
import { CoinService } from "@/modules/coin/service/coin.service";
import {
  AVATAR_FRAMES,
  BANNER_EFFECTS,
  COSMETICS_BY_KEY,
  type Cosmetic,
  type CosmeticUnlockState,
  HEX_COLOR_REGEX,
  isCosmeticUnlocked,
  PROFILE_COLORS,
  PROFILE_COLORS_BY_VALUE,
  PROFILE_GRADIENT_PREFIX,
  PROFILE_TITLES,
} from "@/shared/constants/cosmetics";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { PurchaseCosmeticDto } from "../dto/purchase-cosmetic.dto";

type EquippedCosmetics = {
  color: string | null;
  avatarFrame: string | null;
  title: string | null;
  bannerEffect: string | null;
};

@Injectable()
export class CosmeticService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly coinService: CoinService,
  ) {}

  async getCatalog(userId: string) {
    const [state, profile] = await Promise.all([this.getUnlockState(userId), this.getEquipped(userId)]);

    const toItem = (type: CosmeticType, equippedValue: string | null) => (cosmetic: Cosmetic) => ({
      key: cosmetic.key,
      value: cosmetic.value,
      unlock: cosmetic.unlock,
      unlocked: isCosmeticUnlocked(type, cosmetic, state),
      owned: state.ownedKeys.has(`${type}:${cosmetic.key}`),
      equipped: equippedValue === cosmetic.value,
    });

    return {
      profileColors: PROFILE_COLORS.map(toItem(CosmeticType.ProfileColor, profile.color)),
      avatarFrames: AVATAR_FRAMES.map(toItem(CosmeticType.AvatarFrame, profile.avatarFrame ?? "none")),
      profileTitles: PROFILE_TITLES.map(toItem(CosmeticType.ProfileTitle, profile.title ?? "none")),
      bannerEffects: BANNER_EFFECTS.map(toItem(CosmeticType.BannerEffect, profile.bannerEffect ?? "none")),
    };
  }

  // Checagem no cliente é só UX: a cor só entra no perfil se passar por aqui.
  // Qualquer hex é livre (custom color); só gradientes exigem posse.
  async assertProfileColorUnlocked(userId: string, value: string) {
    if (HEX_COLOR_REGEX.test(value)) return;

    if (!value.startsWith(PROFILE_GRADIENT_PREFIX)) {
      throw new AppException(ERROR_CODES.COSMETIC_NOT_FOUND);
    }

    const cosmetic = PROFILE_COLORS_BY_VALUE.get(value);

    if (!cosmetic) {
      throw new AppException(ERROR_CODES.COSMETIC_NOT_FOUND);
    }

    const state = await this.getUnlockState(userId);

    if (!isCosmeticUnlocked(CosmeticType.ProfileColor, cosmetic, state)) {
      throw new AppException(ERROR_CODES.COSMETIC_LOCKED);
    }
  }

  // Para os tipos equipados por key (moldura, título, efeito de banner).
  // "none" é o estado desequipado e passa sempre.
  async assertCosmeticUnlocked(userId: string, type: CosmeticType, key: string) {
    if (key === "none") return;

    const cosmetic = COSMETICS_BY_KEY[type].get(key);

    if (!cosmetic) {
      throw new AppException(ERROR_CODES.COSMETIC_NOT_FOUND);
    }

    const state = await this.getUnlockState(userId);

    if (!isCosmeticUnlocked(type, cosmetic, state)) {
      throw new AppException(ERROR_CODES.COSMETIC_LOCKED);
    }
  }

  async purchaseCosmetic(userId: string, purchaseCosmeticDto: PurchaseCosmeticDto) {
    const { type, key } = purchaseCosmeticDto;

    const cosmetic = COSMETICS_BY_KEY[type].get(key);

    if (!cosmetic) {
      throw new AppException(ERROR_CODES.COSMETIC_NOT_FOUND);
    }

    if (cosmetic.unlock.type !== "purchase") {
      throw new AppException(ERROR_CODES.COSMETIC_NOT_PURCHASABLE);
    }

    const price = cosmetic.unlock.price;

    const owned = await this.databaseService.userCosmetic.findUnique({
      where: { userId_type_key: { userId, type, key } },
    });

    if (owned) {
      throw new AppException(ERROR_CODES.COSMETIC_ALREADY_OWNED);
    }

    await this.databaseService.$transaction(async (tx) => {
      const spent = await this.coinService.spendCoins(
        {
          userId,
          reason: CoinReason.Purchase,
          sourceKey: `purchase:${type}:${key}`,
          amount: price,
          metadata: { type, key },
        },
        tx,
      );

      // null = sourceKey já pago: uma compra concorrente ganhou a corrida.
      if (!spent) {
        throw new AppException(ERROR_CODES.COSMETIC_ALREADY_OWNED);
      }

      await tx.userCosmetic.create({ data: { userId, type, key } });
    });

    const wallet = await this.coinService.getWalletByUserId(userId);

    return {
      wallet,
      cosmetic: {
        key: cosmetic.key,
        value: cosmetic.value,
        unlock: cosmetic.unlock,
        unlocked: true,
        owned: true,
        equipped: false,
      },
    };
  }

  private async getEquipped(userId: string): Promise<EquippedCosmetics> {
    const profile = await this.databaseService.profile.findUnique({
      where: { userId },
      select: { color: true, avatarFrame: true, title: true, bannerEffect: true },
    });

    return {
      color: profile?.color ?? null,
      avatarFrame: profile?.avatarFrame ?? null,
      title: profile?.title ?? null,
      bannerEffect: profile?.bannerEffect ?? null,
    };
  }

  private async getUnlockState(userId: string): Promise<CosmeticUnlockState> {
    const [xp, completed, owned] = await Promise.all([
      this.databaseService.userXp.findUnique({ where: { userId }, select: { level: true } }),
      this.databaseService.userMission.findMany({
        where: { userId, completedAt: { not: null } },
        select: { mission: { select: { key: true } } },
      }),
      this.databaseService.userCosmetic.findMany({ where: { userId }, select: { type: true, key: true } }),
    ]);

    return {
      level: xp?.level ?? 1,
      completedMissionKeys: new Set(completed.map(({ mission }) => mission.key)),
      ownedKeys: new Set(owned.map(({ type, key }) => `${type}:${key}`)),
    };
  }
}
