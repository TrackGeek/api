function filtersToString(filters: Record<string, any>) {
  const filterStr = Object.entries(filters)
    .filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join(":");

  return filterStr ? `:${filterStr}` : "";
}

export const CACHE_KEYS = {
  HARDCOVER_SEARCH_BOOKS: {
    prefix: (filters: Record<string, any>) => `hardcover:search:book:${filtersToString(filters)}`,
    expiration: 3600 * 24 * 7,
  },
  HARDCOVER_TOP_BOOKS: {
    prefix: (filters: Record<string, any>) => `hardcover:top:book:${filtersToString(filters)}`,
    expiration: 3600 * 24 * 7,
  },
  HARDCOVER_BOOK_BY_ID: {
    prefix: (hardcoverId: number) => `hardcover:detail:book:${hardcoverId}`,
    expiration: 3600 * 24 * 7,
  },
  HARDCOVER_BOOK_CATEGORIES: {
    prefix: "hardcover:categories:book",
    expiration: 3600 * 24 * 7,
  },
  HARDCOVER_BOOK_STATUSES: {
    prefix: "hardcover:statuses:book",
    expiration: 3600 * 24 * 7,
  },
  HARDCOVER_SERIES_BY_ID: {
    prefix: (seriesId: number) => `hardcover:series:book:${seriesId}`,
    expiration: 3600 * 24 * 7,
  },

  IGDB_ACCESS_TOKEN: "igdb:token",
  IGDB_SEARCH_GAMES: {
    prefix: (filters: Record<string, any>) => `igdb:search:game:v2${filtersToString(filters)}`,
    expiration: 3600 * 24 * 7,
  },
  IGDB_GAME_GENRES: {
    prefix: "igdb:genres:game",
    expiration: 3600 * 24 * 7,
  },
  IGDB_GAME_STATUS: {
    prefix: "igdb:status:game",
    expiration: 3600 * 24 * 7,
  },
  IGDB_GAME_MODES: {
    prefix: "igdb:modes:game",
    expiration: 3600 * 24 * 7,
  },
  IGDB_GAME_PLATFORMS: {
    prefix: "igdb:platforms:game",
    expiration: 3600 * 24 * 7,
  },
  IGDB_TOP_GAMES: {
    prefix: (filters: Record<string, any>) => `igdb:top:game:${filtersToString(filters)}`,
    expiration: 3600 * 24 * 7,
  },
  IGDB_GAME_BY_ID: {
    prefix: (igdbId: number) => `igdb:detail:game:id:${igdbId}`,
    expiration: 3600 * 24 * 7,
  },
  IGDB_FRANCHISE_BY_SLUG: {
    prefix: (slug: string) => `igdb:franchise:game:slug:${slug}`,
    expiration: 3600 * 24 * 7,
  },
  IGDB_COMPANY_BY_ID: {
    prefix: (companyId: number) => `igdb:company:game:id:${companyId}`,
    expiration: 3600 * 24 * 7,
  },

  TENRAI_SEARCH_ANIMES: {
    prefix: (filters: Record<string, any>) => `tenrai:search:anime:${filtersToString(filters)}`,
    expiration: 3600 * 24 * 7,
  },
  TENRAI_ANIME_GENRES: {
    prefix: "tenrai:genres:anime",
    expiration: 3600 * 24 * 7,
  },
  TENRAI_ANIME_BY_ID: {
    prefix: (malId: number) => `tenrai:detail:anime:id:${malId}`,
    expiration: 3600 * 24 * 7,
  },
  TENRAI_ANIME_EPISODES_BY_ID: {
    prefix: ({ malId, ...filters }: Record<string, any>) =>
      `tenrai:detail:anime:id:${malId}:episodes:${filtersToString(filters)}`,
    expiration: 3600 * 24 * 7,
  },
  TENRAI_ANIME_RECOMMENDATIONS: {
    prefix: (filters: Record<string, any>) => `tenrai:recommendations:anime:${filtersToString(filters)}`,
    expiration: 3600 * 24 * 7,
  },
  TENRAI_TOP_ANIMES: {
    prefix: (filters: Record<string, any>) => `tenrai:top:anime:${filtersToString(filters)}`,
    expiration: 3600 * 24 * 7,
  },
  TENRAI_PERSON_BY_ID: {
    prefix: (malId: number) => `tenrai:detail:person:id:${malId}`,
    expiration: 3600 * 24 * 7,
  },
  TENRAI_PRODUCER_BY_ID: {
    prefix: (malId: number) => `tenrai:detail:producer:id:${malId}`,
    expiration: 3600 * 24 * 7,
  },

  ANILIST_SEARCH_MANGAS: {
    prefix: (filters: Record<string, any>) => `anilist:search:manga:${filtersToString(filters)}`,
    expiration: 3600 * 24 * 7,
  },
  ANILIST_TOP_MANGAS: {
    prefix: (filters: Record<string, any>) => `anilist:top:manga:${filtersToString(filters)}`,
    expiration: 3600 * 24 * 7,
  },
  ANILIST_MANGA_BY_ID: {
    prefix: (anilistId: number) => `anilist:detail:manga:id:${anilistId}`,
    expiration: 3600 * 24 * 7,
  },
  ANILIST_STAFF_BY_ID: {
    prefix: (anilistId: number) => `anilist:detail:staff:id:${anilistId}`,
    expiration: 3600 * 24 * 7,
  },
  ANILIST_MANGA_GENRES: {
    prefix: "anilist:genres:manga",
    expiration: 3600 * 24 * 7,
  },
  ANILIST_MANGA_TAGS: {
    prefix: "anilist:tags:manga",
    expiration: 3600 * 24 * 7,
  },

  TMDB_SEARCH_MOVIES: {
    prefix: (filters: Record<string, any>) => `tmdb:search:movie:${filtersToString(filters)}`,
    expiration: 3600 * 24 * 7,
  },
  TMDB_TOP_MOVIES: {
    prefix: (filters: Record<string, any>) => `tmdb:top:movie:${filtersToString(filters)}`,
    expiration: 3600 * 24 * 7,
  },
  TMDB_SEARCH_TV_SHOWS: {
    prefix: (filters: Record<string, any>) => `tmdb:search:tvShow:${filtersToString(filters)}`,
    expiration: 3600 * 24 * 7,
  },
  TMDB_TOP_TV_SHOWS: {
    prefix: (filters: Record<string, any>) => `tmdb:top:tvShow:${filtersToString(filters)}`,
    expiration: 3600 * 24 * 7,
  },
  TMDB_MOVIE_BY_ID: {
    prefix: (tmdbId: number) => `tmdb:detail:movie:id:${tmdbId}`,
    expiration: 3600 * 24 * 7,
  },
  TMDB_MOVIE_COLLECTION_BY_ID: {
    prefix: (collectionId: number) => `tmdb:collection:movie:id:${collectionId}`,
    expiration: 3600 * 24 * 7,
  },
  TMDB_MOVIE_GENRES: {
    prefix: "tmdb:genres:movie",
    expiration: 3600 * 24 * 7,
  },
  TMDB_TV_SHOW_BY_ID: {
    prefix: (tmdbId: number) => `tmdb:detail:tvShow:id:${tmdbId}`,
    expiration: 3600 * 24 * 7,
  },
  TMDB_TV_SHOW_SEASONS_BY_ID: {
    prefix: (tmdbId: number) => `tmdb:detail:tvShow:id:${tmdbId}:season`,
    expiration: 3600 * 24 * 7,
  },
  TMDB_TV_SHOW_SEASON_EPISODES_BY_ID: {
    prefix: (tmdbId: number, seasonId: number) => `tmdb:detail:tvShow:id:${tmdbId}:season:${seasonId}:episode`,
    expiration: 3600 * 24 * 7,
  },
  TMDB_TV_SHOW_GENRES: {
    prefix: "tmdb:genres:tvShow",
    expiration: 3600 * 24 * 7,
  },
  TMDB_PERSON_BY_ID: {
    prefix: (tmdbId: number) => `tmdb:detail:person:id:${tmdbId}`,
    expiration: 3600 * 24 * 7,
  },
  TMDB_COMPANY_BY_ID: {
    prefix: (companyId: number) => `tmdb:detail:company:id:${companyId}`,
    expiration: 3600 * 24 * 7,
  },
  TMDB_COMPANY_MEDIA_BY_ID: {
    prefix: (companyId: number, mediaType: string) => `tmdb:company:${mediaType}:id:${companyId}`,
    expiration: 3600 * 24 * 7,
  },

  CONVERT_CURRENCY: {
    prefix: (value: number, from: string, to: string) => `currency:convert:${value}:${from}:${to}`,
    expiration: 3600 * 6,
  },
} as const;
