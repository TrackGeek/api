import { Prisma } from "@prisma/generated/client";
import { REWIND_START, type RewindContentType, TRACKGEEK_LAUNCH } from "./rewind.constants";

const SOURCES = [
  ["movie", "MovieProgress", "Movie", "movieId", "title", "posterUrl", "tmdbId", "MovieReview"],
  ["tv", "TVShowProgress", "TVShow", "tvShowId", "name", "posterUrl", "tmdbId", "TVShowReview"],
  ["anime", "AnimeProgress", "Anime", "animeId", "title", "imageUrl", "malId", "AnimeReview"],
  ["game", "GameProgress", "Game", "gameId", "name", "coverUrl", "igdbId", "GameReview"],
  ["manga", "MangaProgress", "Manga", "mangaId", "title", "imageUrl", "anilistId", "MangaReview"],
  ["book", "BookProgress", "Book", "bookId", "title", "imageUrl", "hardcoverId", "BookReview"],
] as const;

export interface RewindProgressRow {
  type: RewindContentType;
  id: string;
  title: string | null;
  image: string | null;
  slug: string | null;
  recordedAt: Date;
  completed: boolean;
}

export interface RewindGlobalRow {
  type: RewindContentType;
  tracked: number;
  completed: number;
  people: number;
}

export interface RewindReviewRow extends Omit<RewindProgressRow, "completed"> {
  overall: number;
  favorite: boolean;
}

export function rewindReviewsQuery(cutoff: Date, userId: string) {
  return Prisma.join(
    SOURCES.map(([type, , media, foreignKey, title, image, slug, review]) => {
      const imageSql = type === "book" ? Prisma.sql`m."imageUrl"->>'url'` : Prisma.sql`m.${Prisma.raw(`"${image}"`)}`;
      const slugSql =
        type === "manga"
          ? Prisma.sql`COALESCE(m."anilistId", m."malId")::text`
          : Prisma.sql`m.${Prisma.raw(`"${slug}"`)}::text`;

      return Prisma.sql`
        SELECT ${type}::text AS type, m."id", m.${Prisma.raw(`"${title}"`)} AS title,
          ${imageSql} AS image, ${slugSql} AS slug,
          r."createdAt" AT TIME ZONE 'UTC' AS "recordedAt", r."overall"::float8 AS overall,
          EXISTS (
            SELECT 1 FROM "Favorite" f
            WHERE f."userId" = ${userId} AND f.${Prisma.raw(`"${foreignKey}"`)} = m."id"
              AND f."createdAt" >= ${REWIND_START} AND f."createdAt" < ${cutoff}
          ) AS favorite
        FROM ${Prisma.raw(`"${review}"`)} r
        JOIN ${Prisma.raw(`"${media}"`)} m ON m."id" = r.${Prisma.raw(`"${foreignKey}"`)}
        WHERE r."userId" = ${userId}
          AND r."createdAt" >= ${REWIND_START} AND r."createdAt" < ${cutoff}
      `;
    }),
    " UNION ALL ",
  );
}

export function rewindProgressCte(cutoff: Date, userId?: string) {
  const sources = SOURCES.map(([type, progress, media, foreignKey, title, image, slug]) => {
    const imageSql = type === "book" ? Prisma.sql`m."imageUrl"->>'url'` : Prisma.sql`m.${Prisma.raw(`"${image}"`)}`;
    const slugSql =
      type === "manga"
        ? Prisma.sql`COALESCE(m."anilistId", m."malId")::text`
        : Prisma.sql`m.${Prisma.raw(`"${slug}"`)}::text`;

    return Prisma.sql`
      SELECT ${type}::text AS type, p."userId", m."id", m.${Prisma.raw(`"${title}"`)} AS title,
        ${imageSql} AS image, ${slugSql} AS slug,
        p."createdAt", p."startedAt", p."completedAt"
      FROM ${Prisma.raw(`"${progress}"`)} p
      JOIN ${Prisma.raw(`"${media}"`)} m ON m."id" = p.${Prisma.raw(`"${foreignKey}"`)}
      WHERE p."createdAt" < ${cutoff}
        AND p."status" NOT IN ('NotWatched', 'NotRead', 'NotPlayed')
        ${userId === undefined ? Prisma.sql`AND p."createdAt" >= ${TRACKGEEK_LAUNCH}` : Prisma.sql`AND p."userId" = ${userId}`}
    `;
  });

  return Prisma.sql`
    WITH progress AS (${Prisma.join(sources, " UNION ALL ")}),
    eligible AS (
      SELECT *, COALESCE(LEAST(
        CASE WHEN "startedAt" >= ${REWIND_START} AND "startedAt" < ${cutoff} THEN "startedAt" END,
        CASE WHEN "completedAt" >= ${REWIND_START} AND "completedAt" < ${cutoff} THEN "completedAt" END
      ), "createdAt") AT TIME ZONE 'UTC' AS "recordedAt",
      COALESCE("completedAt" >= ${REWIND_START} AND "completedAt" < ${cutoff}, false) AS completed
      FROM progress
      WHERE ("startedAt" >= ${REWIND_START} AND "startedAt" < ${cutoff})
        OR ("completedAt" >= ${REWIND_START} AND "completedAt" < ${cutoff})
        OR ("startedAt" IS NULL AND "completedAt" IS NULL
          AND "createdAt" >= ${REWIND_START} AND "createdAt" < ${cutoff})
    )
  `;
}
