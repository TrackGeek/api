import { ActivityType, ProgressStatus, XpReason } from "@prisma/generated/enums";

const STARTED_STATUSES: ProgressStatus[] = [
  ProgressStatus.Watching,
  ProgressStatus.Playing,
  ProgressStatus.Reading,
  ProgressStatus.Rewatching,
  ProgressStatus.Replaying,
  ProgressStatus.Rereading,
];

export function activityTypeFromProgressStatus(status: ProgressStatus): ActivityType | null {
  if (status === ProgressStatus.Completed) {
    return ActivityType.ProgressCompleted;
  }

  if (status === ProgressStatus.Paused) {
    return ActivityType.ProgressPaused;
  }

  if (status === ProgressStatus.Dropped) {
    return ActivityType.ProgressDropped;
  }

  if (STARTED_STATUSES.includes(status)) {
    return ActivityType.ProgressStarted;
  }

  return null;
}

export function xpReasonFromProgressStatus(status: ProgressStatus): XpReason | null {
  if (status === ProgressStatus.Completed) {
    return XpReason.ProgressCompleted;
  }

  if (STARTED_STATUSES.includes(status)) {
    return XpReason.ProgressStarted;
  }

  return null;
}
