import { ActivityType, ProgressStatus, XpReason } from "@prisma/generated/enums";

const STARTED_STATUSES: ProgressStatus[] = [
  ProgressStatus.Watching,
  ProgressStatus.Playing,
  ProgressStatus.Reading,
  ProgressStatus.Rewatching,
  ProgressStatus.Replaying,
  ProgressStatus.Rereading,
];

// Maps a progress status to the activity it should emit.
// Started (Watching/Playing/Reading and their repeat variants), Completed,
// Paused and Dropped generate activities; every other status returns null.
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

// Só começar e completar valem XP. Pausar e dropar não pagam nada, e como o
// sourceKey é fixo por mídia, alternar entre statuses não paga duas vezes.
export function xpReasonFromProgressStatus(status: ProgressStatus): XpReason | null {
  if (status === ProgressStatus.Completed) {
    return XpReason.ProgressCompleted;
  }

  if (STARTED_STATUSES.includes(status)) {
    return XpReason.ProgressStarted;
  }

  return null;
}
