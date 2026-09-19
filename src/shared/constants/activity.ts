import { ActivityType } from "@prisma/generated/enums";

export const AUTOMATED_ACTIVITY_TYPES = [
  ActivityType.ProgressStarted,
  ActivityType.ProgressCompleted,
  ActivityType.ProgressPaused,
  ActivityType.ProgressDropped,
  ActivityType.ProgressPlanned,
  ActivityType.ScreenshotAdded,
] as const;

export const ACTIVITY_RETENTION_DAYS = 30;

export const ACTIVITY_RETENTION_KEPT_PER_USER = 10;

export const ACTIVITY_CLEANUP_BATCH_SIZE = 5000;
