export const CATCHUP_AUDIT_ACTIONS = {
  UNMATCHED_RELEASE_IGNORED: "UNMATCHED_RELEASE_IGNORED",
  AMBIGUOUS_MATCH_IGNORED: "AMBIGUOUS_MATCH_IGNORED",
  INVALID_PAYLOAD_DISCARDED: "INVALID_PAYLOAD_DISCARDED",
  RELEASE_EVENT_CREATED: "RELEASE_EVENT_CREATED",
  RELEASE_EVENT_UPDATED: "RELEASE_EVENT_UPDATED",
  STATUS_AUTO_REOPENED: "STATUS_AUTO_REOPENED",
  INGESTION_FAILED: "INGESTION_FAILED",
  RELEASE_PROCESSING_FAILED: "RELEASE_PROCESSING_FAILED",
  MEDIA_TYPE_DISABLED: "MEDIA_TYPE_DISABLED",
} as const;

export type CatchupAuditAction = (typeof CATCHUP_AUDIT_ACTIONS)[keyof typeof CATCHUP_AUDIT_ACTIONS];

export const STATUS_TRANSITION_REASONS = {
  NEW_EPISODE_RELEASED: "NEW_EPISODE_RELEASED",
  NEW_CHAPTER_RELEASED: "NEW_CHAPTER_RELEASED",
} as const;

export const ACCESSORY_CONTENT_KEYWORDS = [
  "recap",
  "trailer",
  "teaser",
  "preview",
  "promo",
  "promotional",
  "special",
  "ova",
  "oad",
  "omake",
  "bonus",
  "extra",
  "dub",
] as const;

export const AIRING_ANIME_STATUSES = ["Currently Airing", "RELEASING", "Not yet aired"] as const;

export const RELEASING_MANGA_STATUSES = ["RELEASING", "Publishing", "HIATUS"] as const;

export const RETURNING_TV_SHOW_STATUSES = ["Returning Series", "In Production", "Planned"] as const;

export const PREQUEL_RELATION_TYPES = ["prequel", "parent story"] as const;

export const MIN_FUZZY_MATCH_TITLE_LENGTH = 4;

export const DEFAULT_INGESTION_BATCH_SIZE = 200;

export const DEFAULT_TOLERANCE_DAYS = 1;

export const DEFAULT_FEED_WINDOW_DAYS = 7;

export const EXTERNAL_REQUEST_DELAY_MS = 800;
