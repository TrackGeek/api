import { Injectable } from "@nestjs/common";
import type { PsnAccount } from "@prisma/generated/client";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import { PSN_RECENT_TITLES_LIMIT } from "../constants/psn";
import type { PsnTrophies } from "../types/psn";
import { PsnAccountService } from "./psn-account.service";

const EMPTY_TROPHIES: PsnTrophies = {
  linked: false,
  expired: false,
  profile: null,
  summary: null,
  recentTitles: [],
  updatedAt: null,
};

@Injectable()
export class PsnTrophyService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly integrationsService: IntegrationsService,
    private readonly psnAccountService: PsnAccountService,
  ) {}

  async getTrophiesByUserId(userId: string): Promise<PsnTrophies> {
    const cachedTrophies = await this.cacheService.get<PsnTrophies>(CACHE_KEYS.PSN_TROPHIES.prefix(userId));

    if (cachedTrophies) {
      return cachedTrophies;
    }

    const account = await this.databaseService.psnAccount.findUnique({ where: { userId } });

    if (!account) {
      return EMPTY_TROPHIES;
    }

    if (account.expired) {
      return this.toExpiredTrophies(account);
    }

    try {
      return await this.fetchTrophies(account);
    } catch (_error) {
      return this.toUnavailableTrophies(account);
    }
  }

  async refreshTrophiesByUserId(userId: string): Promise<PsnTrophies> {
    const cooldownKey = CACHE_KEYS.PSN_TROPHIES_REFRESH.prefix(userId);

    if (await this.cacheService.exists(cooldownKey)) {
      throw new AppException(ERROR_CODES.PSN_TROPHIES_ALREADY_REFRESHED);
    }

    const account = await this.databaseService.psnAccount.findUnique({ where: { userId } });

    if (!account) {
      throw new AppException(ERROR_CODES.PSN_ACCOUNT_NOT_LINKED);
    }

    await this.cacheService.set(cooldownKey, true, CACHE_KEYS.PSN_TROPHIES_REFRESH.expiration);

    if (account.expired) {
      return this.toExpiredTrophies(account);
    }

    return this.fetchTrophies(account);
  }

  private async fetchTrophies(account: PsnAccount): Promise<PsnTrophies> {
    const accessToken = await this.psnAccountService.getAccessToken(account);

    if (!accessToken) {
      return this.toExpiredTrophies(account);
    }

    const [summary, profile, recentTitles] = await Promise.all([
      this.integrationsService.psn.getTrophySummary(accessToken),
      this.integrationsService.psn.getProfile(accessToken, account.accountId),
      this.integrationsService.psn.getRecentTitles(accessToken, PSN_RECENT_TITLES_LIMIT),
    ]);

    if (profile.onlineId !== account.onlineId || profile.avatarUrl !== account.avatarUrl) {
      await this.databaseService.psnAccount.updateMany({
        where: { id: account.id },
        data: { onlineId: profile.onlineId, avatarUrl: profile.avatarUrl },
      });
    }

    const trophies: PsnTrophies = {
      linked: true,
      expired: false,
      profile,
      summary: {
        level: summary.level,
        progress: summary.progress,
        tier: summary.tier,
        earnedTrophies: summary.earnedTrophies,
      },
      recentTitles,
      updatedAt: new Date().toISOString(),
    };

    await this.cacheService.set(
      CACHE_KEYS.PSN_TROPHIES.prefix(account.userId),
      trophies,
      CACHE_KEYS.PSN_TROPHIES.expiration,
    );

    return trophies;
  }

  private toUnavailableTrophies(account: PsnAccount): PsnTrophies {
    return {
      ...EMPTY_TROPHIES,
      linked: true,
      profile: { onlineId: account.onlineId, avatarUrl: account.avatarUrl },
    };
  }

  private toExpiredTrophies(account: PsnAccount): PsnTrophies {
    return { ...this.toUnavailableTrophies(account), expired: true };
  }
}
