import { ActivityType, ProgressStatus } from "@prisma/generated/enums";

const STARTED_STATUSES: ProgressStatus[] = [ProgressStatus.Watching, ProgressStatus.Playing, ProgressStatus.Reading];

// Maps a progress status to the activity it should emit.
// Only "started" (Watching/Playing/Reading) and Completed generate activities;
// every other status returns null (no activity).
export function activityTypeFromProgressStatus(status: ProgressStatus): ActivityType | null {
  if (status === ProgressStatus.Completed) {
    return ActivityType.ProgressCompleted;
  }

  if (STARTED_STATUSES.includes(status)) {
    return ActivityType.ProgressStarted;
  }

  return null;
}
