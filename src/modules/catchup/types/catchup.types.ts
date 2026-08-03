import { CatchupMediaType, ProgressStatus, ReleaseEventType, ReleaseSource } from "@prisma/generated/enums";

export interface RawExternalRelease {
  readonly source: ReleaseSource;
  readonly mediaType: CatchupMediaType;
  readonly eventType: ReleaseEventType;
  readonly externalId: string | number | null;
  readonly title: string | null;
  readonly unitNumber?: number | null;
  readonly containerNumber?: number | null;
  readonly unitTitle?: string | null;
  readonly releaseAt?: Date | string | null;
  readonly kind?: string | null;
  readonly discriminator?: string | null;
  readonly payload?: Record<string, unknown>;
}

export interface NormalizedRelease {
  readonly source: ReleaseSource;
  readonly mediaType: CatchupMediaType;
  readonly eventType: ReleaseEventType;
  readonly externalId: string;
  readonly title: string;
  readonly unitNumber: number | null;
  readonly containerNumber: number | null;
  readonly unitTitle: string | null;
  readonly releaseAt: Date;
  readonly isAccessory: boolean;
  readonly discriminator: string | null;
  readonly rawPayload: Record<string, unknown>;
}

export interface InternalTitleMatch {
  readonly titleId: string;
  readonly mediaType: CatchupMediaType;
  readonly title: string;
  readonly confidence: "external-id" | "normalized-title";
}

export interface ImpactedUser {
  readonly userId: string;
  readonly progressId: string | null;
  readonly status: ProgressStatus | null;
}

export interface CatchupRunStats {
  externalReceived: number;
  normalized: number;
  matched: number;
  discarded: number;
  eventsCreated: number;
  usersImpacted: number;
  reopened: number;
  notificationsCreated: number;
  notificationsFailed: number;
}

export function createEmptyRunStats(): CatchupRunStats {
  return {
    externalReceived: 0,
    normalized: 0,
    matched: 0,
    discarded: 0,
    eventsCreated: 0,
    usersImpacted: 0,
    reopened: 0,
    notificationsCreated: 0,
    notificationsFailed: 0,
  };
}
