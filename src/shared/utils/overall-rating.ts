import type { DatabaseService } from "@/shared/infra/database/database.service";

type ReviewModel = "animeReview" | "mangaReview" | "tvShowReview" | "movieReview" | "gameReview" | "bookReview";
type MediaIdField = "animeId" | "mangaId" | "tvShowId" | "movieId" | "gameId" | "bookId";

export async function withOverallRatings<T extends { userId: string; status: string }>(
  databaseService: DatabaseService,
  model: ReviewModel,
  idField: MediaIdField,
  items: T[],
): Promise<(T & { rating: number | null })[]> {
  const completed = items.filter((item) => item.status === "Completed");

  const reviews: { userId: string; overall: unknown; [key: string]: unknown }[] = completed.length
    ? await (databaseService[model] as any).findMany({
        where: {
          userId: { in: [...new Set(completed.map((item) => item.userId))] },
          [idField]: { in: [...new Set(completed.map((item) => (item as any)[idField]))] },
        },
        select: { userId: true, [idField]: true, overall: true },
      })
    : [];

  const ratings = new Map(
    reviews.map((review) => [JSON.stringify([review.userId, review[idField]]), Number(review.overall)]),
  );

  return items.map((item) => ({
    ...item,
    rating: ratings.get(JSON.stringify([item.userId, (item as any)[idField]])) ?? null,
  }));
}
