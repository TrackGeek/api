import type { ProgressFilterParamsDto } from "./dtos/progress-filter.dto";
import {
  MediaReleaseState,
  type MediaType,
  ProgressSortBy,
  ProgressSortOrder,
  rawStatusesForStates,
  unreleasedRawStatuses,
} from "./media-filter.constants";

type Where = Record<string, any>;

const MATCHES_NOTHING: Where = { id: { in: [] } };

const startOfYear = (year: number) => new Date(Date.UTC(year, 0, 1));

const yearRange = (column: string, year: number): Where => ({
  [column]: { gte: startOfYear(year), lt: startOfYear(year + 1) },
});

const genreInStringArray = (column: string) => (genre: string) => ({ [column]: { array_contains: [genre] } });

const genreInObjectArray = (column: string, key: string) => (genre: string) => ({
  [column]: { array_contains: [{ [key]: genre }] },
});

interface MediaFilterFields {
  relation: string;
  titleColumn: string;
  statusColumn: string | null;
  releaseColumns: string[];
  genre: (genre: string) => Where;
  year: (year: number) => Where;
}

const MEDIA_FILTER_FIELDS: Record<MediaType, MediaFilterFields> = {
  anime: {
    relation: "anime",
    titleColumn: "title",
    statusColumn: "status",
    releaseColumns: ["year"],
    genre: genreInStringArray("genres"),
    year: (year) => ({ year }),
  },
  manga: {
    relation: "manga",
    titleColumn: "title",
    statusColumn: "status",
    releaseColumns: [],
    genre: genreInStringArray("genres"),
    year: (year) => ({
      published: {
        path: ["from"],
        gte: startOfYear(year).toISOString(),
        lt: startOfYear(year + 1).toISOString(),
      },
    }),
  },
  tv: {
    relation: "tvShow",
    titleColumn: "name",
    statusColumn: "status",
    releaseColumns: ["firstAirDate"],
    genre: genreInStringArray("genres"),
    year: (year) => yearRange("firstAirDate", year),
  },
  movie: {
    relation: "movie",
    titleColumn: "title",
    statusColumn: "status",
    releaseColumns: ["releaseDate"],
    genre: genreInStringArray("genres"),
    year: (year) => yearRange("releaseDate", year),
  },
  game: {
    relation: "game",
    titleColumn: "name",
    statusColumn: "gameStatus",
    releaseColumns: ["firstReleaseDate"],
    genre: genreInObjectArray("genres", "name"),
    year: (year) => yearRange("firstReleaseDate", year),
  },
  book: {
    relation: "book",
    titleColumn: "title",
    statusColumn: null,
    releaseColumns: ["releaseYear", "releaseDate"],
    genre: genreInObjectArray("taggings", "tag"),
    year: (year) => ({
      OR: [{ releaseYear: year }, { AND: [{ releaseYear: null }, yearRange("releaseDate", year)] }],
    }),
  },
};

function bookReleasedWhere(released: boolean): Where {
  const now = new Date();
  const currentYear = now.getUTCFullYear();

  if (released) {
    return {
      OR: [
        { releaseDate: { lte: now } },
        { AND: [{ releaseDate: null }, { OR: [{ releaseYear: null }, { releaseYear: { lte: currentYear } }] }] },
      ],
    };
  }

  return {
    OR: [{ releaseDate: { gt: now } }, { AND: [{ releaseDate: null }, { releaseYear: { gt: currentYear } }] }],
  };
}

function releaseStatesWhere(mediaType: MediaType, statusColumn: string | null, states: MediaReleaseState[]): Where {
  if (statusColumn === null) {
    const wantsReleased = states.includes(MediaReleaseState.Finished);
    const wantsUnreleased = states.includes(MediaReleaseState.Unreleased);

    if (wantsReleased && wantsUnreleased) return {};
    if (wantsReleased) return bookReleasedWhere(true);
    if (wantsUnreleased) return bookReleasedWhere(false);

    return MATCHES_NOTHING;
  }

  const rawStatuses = rawStatusesForStates(mediaType, states);

  return rawStatuses.length > 0 ? { [statusColumn]: { in: rawStatuses } } : MATCHES_NOTHING;
}

function releasedWhere(mediaType: MediaType, statusColumn: string | null, released: boolean): Where {
  if (statusColumn === null) return bookReleasedWhere(released);

  const unreleased = unreleasedRawStatuses(mediaType);

  if (unreleased.length === 0) return released ? {} : MATCHES_NOTHING;

  return released
    ? { OR: [{ [statusColumn]: { notIn: unreleased } }, { [statusColumn]: null }] }
    : { [statusColumn]: { in: unreleased } };
}

export function buildMediaWhere(mediaType: MediaType, filters: ProgressFilterParamsDto): Where | undefined {
  const fields = MEDIA_FILTER_FIELDS[mediaType];
  const clauses: Where[] = [];

  if (filters.genres?.length) {
    clauses.push({ OR: filters.genres.map(fields.genre) });
  }

  if (filters.year !== undefined) {
    clauses.push(fields.year(filters.year));
  }

  if (filters.releaseStates?.length) {
    clauses.push(releaseStatesWhere(mediaType, fields.statusColumn, filters.releaseStates));
  }

  if (filters.released !== undefined) {
    clauses.push(releasedWhere(mediaType, fields.statusColumn, filters.released));
  }

  if (filters.search?.trim()) {
    clauses.push({ [fields.titleColumn]: { contains: filters.search.trim(), mode: "insensitive" } });
  }

  const applicable = clauses.filter((clause) => Object.keys(clause).length > 0);

  return applicable.length > 0 ? { AND: applicable } : undefined;
}

export function buildProgressOrderBy(mediaType: MediaType, filters: ProgressFilterParamsDto): Where[] {
  const { relation, titleColumn, releaseColumns } = MEDIA_FILTER_FIELDS[mediaType];
  const sortBy = filters.sortBy ?? ProgressSortBy.AddedAt;
  const sort = filters.sortOrder ?? (sortBy === ProgressSortBy.Name ? ProgressSortOrder.Asc : ProgressSortOrder.Desc);
  const byId: Where = { id: sort };

  if (sortBy === ProgressSortBy.Name) {
    return [{ [relation]: { [titleColumn]: sort } }, byId];
  }

  if (sortBy === ProgressSortBy.UpdatedAt) {
    return [{ updatedAt: sort }, byId];
  }

  if (sortBy === ProgressSortBy.ReleaseDate && releaseColumns.length > 0) {
    return [
      ...releaseColumns.map((column) => ({ [relation]: { [column]: { sort, nulls: "last" } } })),
      { [relation]: { [titleColumn]: "asc" } },
      byId,
    ];
  }

  return [{ createdAt: sort }, byId];
}
