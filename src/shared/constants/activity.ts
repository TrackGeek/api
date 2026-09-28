import { ActivityType } from "@prisma/generated/enums";

export const AUTOMATED_ACTIVITY_TYPES = [
  ActivityType.ProgressStarted,
  ActivityType.ProgressCompleted,
  ActivityType.ProgressPaused,
  ActivityType.ProgressDropped,
  ActivityType.ProgressPlanned,
  ActivityType.ScreenshotAdded,
  ActivityType.ChaptersRead,
  ActivityType.Followed,
  ActivityType.FavoriteAdded,
  ActivityType.LevelUp,
  ActivityType.AccountCreated,
  ActivityType.ListCreated,
  ActivityType.ListItemAdded,
  ActivityType.MedalEarned,
  ActivityType.MissionCompleted,
  ActivityType.ReviewAdded,
  ActivityType.Watched,
] as const;

export const ACTIVITY_RETENTION_DAYS = 30;

export const ACTIVITY_RETENTION_KEPT_PER_USER = 10;

export const ACTIVITY_CLEANUP_BATCH_SIZE = 5000;
