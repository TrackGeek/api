export const REWIND_YEAR = 2026;
export const REWIND_START = new Date("2026-01-01T00:00:00.000Z");
export const REWIND_END = new Date("2027-01-01T00:00:00.000Z");
export const TRACKGEEK_LAUNCH = new Date("2026-08-04T00:00:00.000Z");
export const REWIND_FAVORITE_BONUS = 1;
export const REWIND_TYPES = ["movie", "tv", "anime", "game", "manga", "book"] as const;

export type RewindContentType = (typeof REWIND_TYPES)[number];
