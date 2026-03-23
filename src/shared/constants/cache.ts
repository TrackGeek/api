import { filtersToString } from "../utils/filters";

export const CACHE_KEYS = {
  ANIME_BY_MAL_ID: {
    prefix: (malId: number) => `anime:detail:malId:${malId}`,
    expiration: 3600 * 24,
  },
  ANIME_EPISODES_BY_MAL_ID: {
    prefix: (malId: number) => `anime:detail:malId:${malId}:episode`,
    expiration: 3600 * 24,
  },
  BOOK_BY_HARDCOVER_ID: {
    prefix: (hardcoverId: number) => `book:detail:hardcoverId:${hardcoverId}`,
    expiration: 3600 * 24,
  },
  GAME_BY_IGDB_ID: {
    prefix: (igdbId: number) => `game:detail:igdbId:${igdbId}`,
    expiration: 3600 * 24,
  },
  MANGA_BY_MAL_ID: {
    prefix: (malId: number) => `manga:detail:malId:${malId}`,
    expiration: 3600 * 24,
  },
  MOVIE_BY_IMDB_ID: {
    prefix: (imdbId: number) => `movie:detail:imdbId:${imdbId}`,
    expiration: 3600 * 24,
  },
  TV_SHOW_BY_TMDB_ID: {
    prefix: (tmdbId: number) => `tvShow:detail:tmdbId:${tmdbId}`,
    expiration: 3600 * 24,
  },
  TV_SHOW_SEASONS_BY_TMDB_ID: {
    prefix: (tmdbId: number) => `tvShow:detail:tmdbId:${tmdbId}:season`,
    expiration: 3600 * 24,
  },
  HARDCOVER_SEARCH_BOOKS: {
    prefix: (query: string) => `hardcover:search:book:${query}`,
    expiration: 3600 * 24,
  },
  HARDCOVER_TOP_BOOKS: {
    prefix: (filters: Record<string, any>) => `hardcover:top:book:${filtersToString(filters)}`,
    expiration: 3600 * 24,
  },
  HARDCOVER_BOOK_BY_ID: {
    prefix: (hardcoverId: number) => `hardcover:detail:book:${hardcoverId}`,
    expiration: 3600 * 24,
  },
  IGDB_ACCESS_TOKEN: "igdb:token",
  IGDB_SEARCH_GAMES: {
    prefix: (query: string) => `igdb:search:game:${query}`,
    expiration: 3600 * 24,
  },
  IGDB_TOP_GAMES: {
    prefix: (filters: Record<string, any>) => `igdb:top:game:${filtersToString(filters)}`,
    expiration: 3600 * 24,
  },
  IGDB_GAME_BY_ID: {
    prefix: (igdbId: number) => `igdb:detail:game:id:${igdbId}`,
    expiration: 3600 * 24,
  },
  JIKAN_SEARCH_ANIMES: {
    prefix: (filters: Record<string, any>) => `jikan:search:anime:${filtersToString(filters)}`,
    expiration: 3600 * 24,
  },
  JIKAN_SEARCH_MANGAS: {
    prefix: (filters: Record<string, any>) => `jikan:search:manga:${filtersToString(filters)}`,
    expiration: 3600 * 24,
  },
  JIKAN_ANIME_GENRES: {
    prefix: "jikan:genres:anime",
    expiration: 3600 * 24,
  },
  JIKAN_MANGA_GENRES: {
    prefix: "jikan:genres:manga",
    expiration: 3600 * 24,
  },
  JIKAN_ANIME_BY_ID: {
    prefix: (malId: number) => `jikan:detail:anime:id:${malId}`,
    expiration: 3600 * 24,
  },
  JIKAN_ANIME_EPISODES_BY_ID: {
    prefix: ({ malId, ...filters }: Record<string, any>) => `jikan:detail:anime:id:${malId}:episode:${filtersToString(filters)}`,
    expiration: 3600 * 24,
  },
  JIKAN_ANIME_RECOMMENDATIONS: {
    prefix: (filters: Record<string, any>) => `jikan:recommendations:anime:${filtersToString(filters)}`,
    expiration: 3600 * 24,
  },
  JIKAN_MANGA_RECOMMENDATIONS: {
    prefix: (filters: Record<string, any>) => `jikan:recommendations:manga:${filtersToString(filters)}`,
    expiration: 3600 * 24,
  },
  JIKAN_TOP_ANIMES: {
    prefix: (filters: Record<string, any>) => `jikan:top:anime:${filtersToString(filters)}`,
    expiration: 3600 * 24,
  },
  JIKAN_TOP_MANGAS: {
    prefix: (filters: Record<string, any>) => `jikan:top:manga:${filtersToString(filters)}`,
    expiration: 3600 * 24,
  },
  JIKAN_MANGA_BY_ID: {
    prefix: (malId: number) => `jikan:detail:manga:id:${malId}`,
    expiration: 3600 * 24,
  },
  TMDB_SEARCH_MOVIES: {
    prefix: (query: string) => `tmdb:search:movie:${query}`,
    expiration: 3600 * 24,
  },
  TMDB_TOP_MOVIES: {
    prefix: (filters: Record<string, any>) => `tmdb:top:movie:${filtersToString(filters)}`,
    expiration: 3600 * 24,
  },
  TMDB_SEARCH_TV_SHOWS: {
    prefix: (query: string) => `tmdb:search:tvShow:${query}`,
    expiration: 3600 * 24,
  },
  TMDB_TOP_TV_SHOWS: {
    prefix: (filters: Record<string, any>) => `tmdb:top:tvShow:${filtersToString(filters)}`,
    expiration: 3600 * 24,
  },
  TMDB_MOVIE_BY_ID: {
    prefix: (tmdbId: number) => `tmdb:detail:movie:id:${tmdbId}`,
    expiration: 3600 * 24,
  },
  TMDB_TV_SHOW_BY_ID: {
    prefix: (tmdbId: number) => `tmdb:detail:tvShow:id:${tmdbId}`,
    expiration: 3600 * 24,
  },
  TMDB_TV_SHOW_SEASONS_BY_ID: {
    prefix: (tmdbId: number) => `tmdb:detail:tvShow:id:${tmdbId}:season`,
    expiration: 3600 * 24,
  },
  CONVERT_CURRENCY: {
    prefix: (value: number, from: string, to: string) => `currency:convert:${value}:${from}:${to}`,
    expiration: 3600 * 6,
  },
} as const;
