import { Injectable, Logger } from "@nestjs/common";
import {
  type AuthorizationPayload,
  exchangeAccessCodeForAuthTokens,
  exchangeNpssoForAccessCode,
  exchangeRefreshTokenForAuthTokens,
  getProfileFromAccountId,
  getUserTitles,
  getUserTrophyProfileSummary,
} from "psn-api";
import { z } from "zod";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";

const trophyCountsSchema = z.object({
  platinum: z.number(),
  gold: z.number(),
  silver: z.number(),
  bronze: z.number(),
});

const authTokensSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.number(),
  refreshToken: z.string().min(1),
  refreshTokenExpiresIn: z.number(),
});

const trophySummarySchema = z.object({
  accountId: z.string(),
  trophyLevel: z.coerce.number(),
  progress: z.number(),
  tier: z.number(),
  earnedTrophies: trophyCountsSchema,
});

const profileSchema = z.object({
  onlineId: z.string(),
  avatars: z.array(z.object({ size: z.string(), url: z.string() })),
});

const trophyTitlesSchema = z.object({
  trophyTitles: z.array(
    z.object({
      npCommunicationId: z.string(),
      trophyTitleName: z.string(),
      trophyTitleIconUrl: z.string(),
      trophyTitlePlatform: z.string(),
      progress: z.number(),
      earnedTrophies: trophyCountsSchema,
      definedTrophies: trophyCountsSchema,
      lastUpdatedDateTime: z.string(),
    }),
  ),
});

const AVATAR_SIZE_ORDER = ["xl", "l", "m", "s"];

export type PSNTrophyCounts = z.infer<typeof trophyCountsSchema>;

export type PSNAuthTokens = z.infer<typeof authTokensSchema>;

export interface PSNTrophySummary {
  accountId: string;
  level: number;
  progress: number;
  tier: number;
  earnedTrophies: PSNTrophyCounts;
}

export interface PSNProfile {
  onlineId: string;
  avatarUrl: string | null;
}

export interface PSNTrophyTitle {
  npCommunicationId: string;
  name: string;
  iconUrl: string;
  platform: string;
  progress: number;
  earnedTrophies: PSNTrophyCounts;
  definedTrophies: PSNTrophyCounts;
  lastUpdatedAt: string;
}

@Injectable()
export class PSNService {
  private readonly logger = new Logger(PSNService.name);

  async exchangeNpsso(npsso: string): Promise<PSNAuthTokens> {
    let accessCode: string;

    try {
      accessCode = await exchangeNpssoForAccessCode(npsso);
    } catch (_error) {
      throw new AppException(ERROR_CODES.PSN_INVALID_NPSSO);
    }

    const tokens = await this.request("exchange access code", () => exchangeAccessCodeForAuthTokens(accessCode));
    const parsed = authTokensSchema.safeParse(tokens);

    if (!parsed.success) {
      throw new AppException(ERROR_CODES.PSN_INVALID_NPSSO);
    }

    return parsed.data;
  }

  async refreshTokens(refreshToken: string): Promise<PSNAuthTokens | null> {
    const tokens = await this.request("refresh tokens", () => exchangeRefreshTokenForAuthTokens(refreshToken));
    const parsed = authTokensSchema.safeParse(tokens);

    return parsed.success ? parsed.data : null;
  }

  async getTrophySummary(accessToken: string): Promise<PSNTrophySummary> {
    const response = await this.request("get trophy summary", () =>
      getUserTrophyProfileSummary(this.toAuthorization(accessToken), "me"),
    );
    const summary = this.parse("trophy summary", trophySummarySchema, response);

    return {
      accountId: summary.accountId,
      level: summary.trophyLevel,
      progress: summary.progress,
      tier: summary.tier,
      earnedTrophies: summary.earnedTrophies,
    };
  }

  async getProfile(accessToken: string, accountId: string): Promise<PSNProfile> {
    const response = await this.request("get profile", () =>
      getProfileFromAccountId(this.toAuthorization(accessToken), accountId),
    );
    const profile = this.parse("profile", profileSchema, response);

    const largestAvatar = [...profile.avatars].sort(
      (a, b) => AVATAR_SIZE_ORDER.indexOf(a.size) - AVATAR_SIZE_ORDER.indexOf(b.size),
    )[0];

    return {
      onlineId: profile.onlineId,
      avatarUrl: largestAvatar?.url ?? null,
    };
  }

  async getRecentTitles(accessToken: string, limit: number): Promise<PSNTrophyTitle[]> {
    const response = await this.request("get recent titles", () =>
      getUserTitles(this.toAuthorization(accessToken), "me", { limit }),
    );
    const { trophyTitles } = this.parse("recent titles", trophyTitlesSchema, response);

    return trophyTitles.map((title) => ({
      npCommunicationId: title.npCommunicationId,
      name: title.trophyTitleName,
      iconUrl: title.trophyTitleIconUrl,
      platform: title.trophyTitlePlatform,
      progress: title.progress,
      earnedTrophies: title.earnedTrophies,
      definedTrophies: title.definedTrophies,
      lastUpdatedAt: title.lastUpdatedDateTime,
    }));
  }

  private toAuthorization(accessToken: string): AuthorizationPayload {
    return { accessToken };
  }

  private async request<T>(operation: string, call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (error) {
      this.logger.error(`Failed to ${operation} on PSN`, error);

      throw new AppException(ERROR_CODES.PSN_SERVICE_UNAVAILABLE);
    }
  }

  private parse<T>(resource: string, schema: z.ZodType<T>, data: unknown): T {
    const parsed = schema.safeParse(data);

    if (!parsed.success) {
      this.logger.error(`Unexpected PSN ${resource} response`, parsed.error);

      throw new AppException(ERROR_CODES.PSN_SERVICE_UNAVAILABLE);
    }

    return parsed.data;
  }
}
