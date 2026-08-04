import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/generated/client";
import type { ProgressStatus } from "@prisma/generated/enums";
import { type DatabaseModel, DatabaseService } from "@/shared/infra/database/database.service";
import {
  hasReleaseStatusColumn,
  MEDIA_RELEASE_STATE_ORDER,
  MediaReleaseState,
  type MediaType,
  toMediaReleaseState,
} from "./media-filter.constants";

/** Options actually present in a user's library — the client only offers filters that can match. */
export interface MediaFilterOptions {
  genres: string[];
  years: number[];
  releaseStates: MediaReleaseState[];
}

export type ProgressStatusCounts = Partial<Record<ProgressStatus, number>>;

interface FilterOptionRow {
  genres: unknown;
  year: number | null;
  status: string | null;
  releasedAt: Date | null;
}

/**
 * One row per tracked media. `year` is normalized in SQL because each provider stores it
 * differently (scalar column, timestamp, or a JSON `published.from`).
 */
const OPTION_QUERIES: Record<MediaType, (userId: string) => Prisma.Sql> = {
  anime: (userId) => Prisma.sql`
    SELECT m."genres" AS genres, m."year" AS year, m."status" AS status, NULL::timestamp AS "releasedAt"
    FROM "AnimeProgress" p
    JOIN "Anime" m ON m."id" = p."animeId"
    WHERE p."userId" = ${userId}
  `,
  manga: (userId) => Prisma.sql`
    SELECT m."genres" AS genres,
           EXTRACT(YEAR FROM (m."published"->>'from')::timestamptz)::int AS year,
           m."status" AS status,
           NULL::timestamp AS "releasedAt"
    FROM "MangaProgress" p
    JOIN "Manga" m ON m."id" = p."mangaId"
    WHERE p."userId" = ${userId}
  `,
  tv: (userId) => Prisma.sql`
    SELECT m."genres" AS genres,
           EXTRACT(YEAR FROM m."firstAirDate")::int AS year,
           m."status" AS status,
           NULL::timestamp AS "releasedAt"
    FROM "TVShowProgress" p
    JOIN "TVShow" m ON m."id" = p."tvShowId"
    WHERE p."userId" = ${userId}
  `,
  movie: (userId) => Prisma.sql`
    SELECT m."genres" AS genres,
           EXTRACT(YEAR FROM m."releaseDate")::int AS year,
           m."status" AS status,
           NULL::timestamp AS "releasedAt"
    FROM "MovieProgress" p
    JOIN "Movie" m ON m."id" = p."movieId"
    WHERE p."userId" = ${userId}
  `,
  game: (userId) => Prisma.sql`
    SELECT m."genres" AS genres,
           EXTRACT(YEAR FROM m."firstReleaseDate")::int AS year,
           m."gameStatus" AS status,
           NULL::timestamp AS "releasedAt"
    FROM "GameProgress" p
    JOIN "Game" m ON m."id" = p."gameId"
    WHERE p."userId" = ${userId}
  `,
  book: (userId) => Prisma.sql`
    SELECT m."taggings" AS genres,
           COALESCE(m."releaseYear", EXTRACT(YEAR FROM m."releaseDate")::int) AS year,
           NULL::text AS status,
           COALESCE(m."releaseDate", make_timestamp(m."releaseYear", 1, 1, 0, 0, 0)) AS "releasedAt"
    FROM "BookProgress" p
    JOIN "Book" m ON m."id" = p."bookId"
    WHERE p."userId" = ${userId}
  `,
};

/** Books have no provider status, so the state comes from the release date instead. */
function releaseStateFromDate(releasedAt: Date | null, now: number): MediaReleaseState {
  return releasedAt !== null && releasedAt.getTime() > now ? MediaReleaseState.Unreleased : MediaReleaseState.Finished;
}

/** Genre payloads are string arrays everywhere except games (`{ name }`) and books (`{ tag }`). */
function extractGenres(mediaType: MediaType, value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const key = mediaType === "game" ? "name" : mediaType === "book" ? "tag" : null;

  return value
    .map((entry) => (key === null ? entry : (entry as Record<string, unknown>)?.[key]))
    .filter((genre): genre is string => typeof genre === "string" && genre.length > 0);
}

@Injectable()
export class MediaFilterService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getFilterOptions(mediaType: MediaType, userId: string): Promise<MediaFilterOptions> {
    const rows = await this.databaseService.$queryRaw<FilterOptionRow[]>(OPTION_QUERIES[mediaType](userId));

    const genres = new Set<string>();
    const years = new Set<number>();
    const releaseStates = new Set<MediaReleaseState>();
    const now = Date.now();

    for (const row of rows) {
      for (const genre of extractGenres(mediaType, row.genres)) {
        genres.add(genre);
      }

      if (row.year !== null) {
        years.add(row.year);
      }

      const state = hasReleaseStatusColumn(mediaType)
        ? toMediaReleaseState(mediaType, row.status)
        : releaseStateFromDate(row.releasedAt, now);

      if (state !== null) {
        releaseStates.add(state);
      }
    }

    return {
      genres: [...genres].sort((a, b) => a.localeCompare(b)),
      years: [...years].sort((a, b) => b - a),
      releaseStates: MEDIA_RELEASE_STATE_ORDER.filter((state) => releaseStates.has(state)),
    };
  }

  /**
   * Totals per progress status for the same filters as the listing, so the client can render
   * accurate section counts without loading every page.
   */
  async countProgressByStatus(model: DatabaseModel, where: object): Promise<ProgressStatusCounts> {
    const groups = await (this.databaseService[model] as any).groupBy({
      by: ["status"],
      where,
      _count: { status: true },
    });

    return Object.fromEntries(
      groups.map((group: { status: ProgressStatus; _count: { status: number } }) => [
        group.status,
        group._count.status,
      ]),
    );
  }
}
