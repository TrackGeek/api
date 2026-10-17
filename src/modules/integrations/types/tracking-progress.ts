import type { ProgressStatus } from "@prisma/generated/enums";

export interface TrackingProgressPatch {
  status: ProgressStatus;
  startedAt?: Date;
  completedAt?: Date;
  chaptersRead?: number;
  totalPages?: number;
  hoursPlayed?: number;
  platforms?: string[];
  completion?: string;
}
