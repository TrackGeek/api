import { isDeepStrictEqual } from "node:util";

const MEDIA_METRIC_FIELDS = new Set(["rank", "popularity", "malReviewScore", "tmdbReviewScore"]);

export function hasMediaContentChanges(stored: Record<string, unknown>, incoming: object): boolean {
  return Object.entries(incoming).some(([key, value]) => {
    if (value === undefined || MEDIA_METRIC_FIELDS.has(key)) {
      return false;
    }

    const previous = JSON.parse(JSON.stringify(stored[key] ?? null));
    const current = JSON.parse(JSON.stringify(value));

    return !isDeepStrictEqual(previous, current);
  });
}
