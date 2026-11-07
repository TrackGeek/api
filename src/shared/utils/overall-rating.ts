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
        where: { OR: completed.map((item) => ({ userId: item.userId, [idField]: (item as any)[idField] })) },
        select: { userId: true, [idField]: true, overall: true },
      })
    : [];

  return items.map((item) => {
    const review = reviews.find((row) => row.userId === item.userId && row[idField] === (item as any)[idField]);
    return { ...item, rating: review ? Number(review.overall) : null };
  });
}
