import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PsnAccount } from "@prisma/generated/client";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import type { PSNAuthTokens } from "@/shared/infra/integrations/psn.service";
import { decrypt, encrypt } from "@/shared/utils/encryption";
import { PSN_TOKEN_EXPIRATION_MARGIN_SECONDS } from "../constants/psn";
import type { PsnAccountStatus } from "../types/psn";

@Injectable()
export class PsnAccountService {
  private readonly pendingRefreshes = new Map<string, Promise<string | null>>();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    private readonly integrationsService: IntegrationsService,
    private readonly configService: ConfigService,
  ) {}

  async link(userId: string, npsso: string): Promise<PsnAccountStatus> {
    const tokens = await this.integrationsService.psn.exchangeNpsso(npsso);
    const summary = await this.integrationsService.psn.getTrophySummary(tokens.accessToken);
    const profile = await this.integrationsService.psn.getProfile(tokens.accessToken, summary.accountId);

    const data = {
      accountId: summary.accountId,
      onlineId: profile.onlineId,
      avatarUrl: profile.avatarUrl,
      refreshToken: this.encrypt(tokens.refreshToken),
      expired: false,
    };

    const account = await this.databaseService.psnAccount.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    await this.cacheAccessToken(userId, tokens);
    await this.cacheService.delete(CACHE_KEYS.PSN_TROPHIES.prefix(userId));

    return this.toStatus(account);
  }

  async unlink(userId: string): Promise<void> {
    const { count } = await this.databaseService.psnAccount.deleteMany({ where: { userId } });

    if (count === 0) {
      throw new AppException(ERROR_CODES.PSN_ACCOUNT_NOT_LINKED);
    }

    await Promise.all([
      this.cacheService.delete(CACHE_KEYS.PSN_ACCESS_TOKEN.prefix(userId)),
      this.cacheService.delete(CACHE_KEYS.PSN_TROPHIES.prefix(userId)),
    ]);
  }

  async getStatus(userId: string): Promise<PsnAccountStatus | null> {
    const account = await this.databaseService.psnAccount.findUnique({ where: { userId } });

    return account ? this.toStatus(account) : null;
  }

  async getAccessToken(account: PsnAccount): Promise<string | null> {
    const cachedAccessToken = await this.cacheService.get<string>(CACHE_KEYS.PSN_ACCESS_TOKEN.prefix(account.userId));

    if (cachedAccessToken) {
      return this.decrypt(cachedAccessToken);
    }

    const pendingRefresh = this.pendingRefreshes.get(account.userId);

    if (pendingRefresh) {
      return pendingRefresh;
    }

    const refresh = this.refreshAccessToken(account).finally(() => this.pendingRefreshes.delete(account.userId));

    this.pendingRefreshes.set(account.userId, refresh);

    return refresh;
  }

  private async refreshAccessToken(account: PsnAccount): Promise<string | null> {
    const tokens = await this.integrationsService.psn.refreshTokens(this.decrypt(account.refreshToken));

    if (!tokens) {
      await this.databaseService.psnAccount.updateMany({
        where: { id: account.id },
        data: { expired: true },
      });

      return null;
    }

    await this.databaseService.psnAccount.updateMany({
      where: { id: account.id },
      data: { refreshToken: this.encrypt(tokens.refreshToken) },
    });

    await this.cacheAccessToken(account.userId, tokens);

    return tokens.accessToken;
  }

  private async cacheAccessToken(userId: string, tokens: PSNAuthTokens): Promise<void> {
    const expiration = Math.min(
      tokens.expiresIn - PSN_TOKEN_EXPIRATION_MARGIN_SECONDS,
      CACHE_KEYS.PSN_ACCESS_TOKEN.expiration,
    );

    if (expiration <= 0) {
      return;
    }

    await this.cacheService.set(
      CACHE_KEYS.PSN_ACCESS_TOKEN.prefix(userId),
      this.encrypt(tokens.accessToken),
      expiration,
    );
  }

  private toStatus(account: PsnAccount): PsnAccountStatus {
    return {
      onlineId: account.onlineId,
      avatarUrl: account.avatarUrl,
      expired: account.expired,
    };
  }

  private encrypt(value: string): string {
    return encrypt(value, this.configService.getOrThrow<string>("ENCRYPTION_KEY"));
  }

  private decrypt(value: string): string {
    return decrypt(value, this.configService.getOrThrow<string>("ENCRYPTION_KEY"));
  }
}
