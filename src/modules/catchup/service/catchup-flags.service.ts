import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DEFAULT_INGESTION_BATCH_SIZE, DEFAULT_TOLERANCE_DAYS } from "../constants/catchup.constants";

export interface CatchupFeatureFlags {
  readonly autoReopenCompletedOnNewContent: boolean;
  readonly notifyPlanToWatchReleases: boolean;
  readonly notifyOnHoldUsers: boolean;
  readonly ignoreSpecialContentForReopen: boolean;
  readonly gamesReleaseNotificationsEnabled: boolean;
  readonly mangaChapterNotificationsEnabled: boolean;
  readonly animeEpisodeNotificationsEnabled: boolean;
  readonly tvShowEpisodeNotificationsEnabled: boolean;
  readonly sequelAddedNotificationsEnabled: boolean;
}

@Injectable()
export class CatchupFlagsService {
  constructor(private readonly configService: ConfigService) {}

  get flags(): CatchupFeatureFlags {
    return {
      autoReopenCompletedOnNewContent: this.readBoolean("CATCHUP_AUTO_REOPEN_COMPLETED_ON_NEW_CONTENT", true),
      notifyPlanToWatchReleases: this.readBoolean("CATCHUP_NOTIFY_PLAN_TO_WATCH_RELEASES", false),
      notifyOnHoldUsers: this.readBoolean("CATCHUP_NOTIFY_ONHOLD_USERS", false),
      ignoreSpecialContentForReopen: this.readBoolean("CATCHUP_IGNORE_SPECIAL_CONTENT_FOR_REOPEN", false),
      gamesReleaseNotificationsEnabled: this.readBoolean("CATCHUP_GAMES_RELEASE_NOTIFICATIONS_ENABLED", true),
      mangaChapterNotificationsEnabled: this.readBoolean("CATCHUP_MANGA_CHAPTER_NOTIFICATIONS_ENABLED", true),
      animeEpisodeNotificationsEnabled: this.readBoolean("CATCHUP_ANIME_EPISODE_NOTIFICATIONS_ENABLED", true),
      tvShowEpisodeNotificationsEnabled: this.readBoolean("CATCHUP_TV_SHOW_EPISODE_NOTIFICATIONS_ENABLED", true),
      sequelAddedNotificationsEnabled: this.readBoolean("CATCHUP_SEQUEL_ADDED_NOTIFICATIONS_ENABLED", true),
    };
  }

  get timeZone(): string {
    return this.configService.get<string>("CATCHUP_TIMEZONE") ?? "UTC";
  }

  get toleranceDays(): number {
    return this.readNumber("CATCHUP_TOLERANCE_DAYS", DEFAULT_TOLERANCE_DAYS);
  }

  get batchSize(): number {
    return this.readNumber("CATCHUP_INGESTION_BATCH_SIZE", DEFAULT_INGESTION_BATCH_SIZE);
  }

  private readBoolean(key: string, fallback: boolean): boolean {
    const value = this.configService.get<string | boolean>(key);

    if (value === undefined || value === null || value === "") {
      return fallback;
    }

    return value === true || value === "true" || value === "1";
  }

  private readNumber(key: string, fallback: number): number {
    const value = Number(this.configService.get<string>(key));

    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}
