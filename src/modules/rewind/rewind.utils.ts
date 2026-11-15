import { REWIND_FAVORITE_BONUS, REWIND_TYPES } from "./rewind.constants";
import type { RewindProgressRow, RewindReviewRow } from "./rewind.queries";

export function summarizeRewind(rows: RewindProgressRow[], reviews: RewindReviewRow[] = []) {
  const monthly = Array.from({ length: 12 }, (_, month) => ({ month, count: 0 }));

  for (const row of rows) {
    monthly[row.recordedAt.getUTCMonth()].count++;
  }

  const categories = REWIND_TYPES.flatMap((type) => {
    const entries = rows.filter((row) => row.type === type);
    if (entries.length === 0) return [];

    const ranked = reviews
      .filter((review) => review.type === type)
      .sort(
        (a, b) =>
          b.overall +
            Number(b.favorite) * REWIND_FAVORITE_BONUS -
            (a.overall + Number(a.favorite) * REWIND_FAVORITE_BONUS) ||
          b.overall - a.overall ||
          b.recordedAt.getTime() - a.recordedAt.getTime() ||
          a.id.localeCompare(b.id),
      );

    return [
      {
        type,
        tracked: entries.length,
        completed: entries.filter((entry) => entry.completed).length,
        titles: ranked.slice(0, 5).map(({ id, title, image, slug, recordedAt, overall, favorite }) => ({
          id,
          title,
          image,
          slug,
          recordedAt: recordedAt.toISOString(),
          overall,
          favorite,
        })),
      },
    ];
  });

  return {
    reviewFavoriteBonus: REWIND_FAVORITE_BONUS,
    tracked: rows.length,
    completed: rows.filter((row) => row.completed).length,
    categories,
    monthly,
    first:
      [...rows]
        .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime() || a.id.localeCompare(b.id))
        .slice(0, 1)
        .map(({ id, type, title, image, slug, recordedAt }) => ({
          id,
          type,
          title,
          image,
          slug,
          recordedAt: recordedAt.toISOString(),
        }))[0] ?? null,
  };
}
