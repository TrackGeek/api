import type { CacheKeys } from '../infra/cache/cache.service';

export const CACHE_KEYS: CacheKeys<
  "ANIME_BY_MAL_ID" |
  "ANIME_EPISODES_BY_MAL_ID" |
  "BOOK_BY_HARDCOVER_ID" |
  "GAME_BY_IGDB_ID" |
  "MANGA_BY_MAL_ID" |
  "MOVIE_BY_IMDB_ID" |
  "TV_SHOW_BY_TMDB_ID" |
  "HARDCOVER_SEARCH_BOOKS" |
  "HARDCOVER_BOOK_BY_ID" |
  "IGDB_ACCESS_TOKEN" |
  "IGDB_SEARCH_GAMES" |
  "IGDB_GAME_BY_ID" |
  "JIKAN_SEARCH_ANIMES" |
  "JIKAN_SEARCH_MANGAS" |
  "JIKAN_ANIME_BY_ID" |
  "JIKAN_ANIME_EPISODES_BY_ID" |
  "JIKAN_MANGA_BY_ID" |
  "TMDB_SEARCH_MOVIES" |
  "TMDB_SEARCH_TV_SHOWS" |
  "TMDB_MOVIE_BY_ID" |
  "TMDB_TV_SHOW_BY_ID"
> = {
  ANIME_BY_MAL_ID: {
    prefix: (malId: number) => `anime:malId:${malId}`,
    expiration: 3600 * 24,
  },
  ANIME_EPISODES_BY_MAL_ID: {
    prefix: (malId: number) => `anime:malId:${malId}:episode`,
    expiration: 3600 * 24,
  },
  BOOK_BY_HARDCOVER_ID: {
    prefix: (hardcoverId: number) => `book:hardcoverId:${hardcoverId}`,
    expiration: 3600 * 24,
  },
  GAME_BY_IGDB_ID: {
    prefix: (igdbId: number) => `game:igdbId:${igdbId}`,
    expiration: 3600 * 24,
  },
  MANGA_BY_MAL_ID: {
    prefix: (malId: number) => `manga:malId:${malId}`,
    expiration: 3600 * 24,
  },
  MOVIE_BY_IMDB_ID: {
    prefix: (imdbId: string) => `movie:imdbId:${imdbId}`,
    expiration: 3600 * 24,
  },
  TV_SHOW_BY_TMDB_ID: {
    prefix: (tmdbId: number) => `tvShow:tmdbId:${tmdbId}`,
    expiration: 3600 * 24,
  },
  HARDCOVER_SEARCH_BOOKS: {
    prefix: (query: string) => `hardcover:search:book:${query}`,
    expiration: 3600 * 24,
  },
  HARDCOVER_BOOK_BY_ID: {
    prefix: (id: number) => `hardcover:detail:book:${id}`,
    expiration: 3600 * 24,
  },
  IGDB_ACCESS_TOKEN: {
    prefix: () => `igdb:accessToken`,
    expiration: 0,
  },
  IGDB_SEARCH_GAMES: {
    prefix: (query: string) => `igdb:search:game:${query}`,
    expiration: 3600 * 24,
  },
  IGDB_GAME_BY_ID: {
    prefix: (id: number) => `igdb:game:id:${id}`,
    expiration: 3600 * 24,
  },
  JIKAN_SEARCH_ANIMES: {
    prefix: (query: string) => `jikan:search:anime:${query}`,
    expiration: 3600 * 24,
  },
  JIKAN_SEARCH_MANGAS: {
    prefix: (query: string) => `jikan:search:manga:${query}`,
    expiration: 3600 * 24,
  },
  JIKAN_ANIME_BY_ID: {
    prefix: (malId: number) => `jikan:anime:id:${malId}`,
    expiration: 3600 * 24,
  },
  JIKAN_ANIME_EPISODES_BY_ID: {
    prefix: (malId: number) => `jikan:anime:id:${malId}:episode`,
    expiration: 3600 * 24,
  },
  JIKAN_MANGA_BY_ID: {
    prefix: (malId: number) => `jikan:manga:id:${malId}`,
    expiration: 3600 * 24,
  },
  TMDB_SEARCH_MOVIES: {
    prefix: (query: string) => `tmdb:search:movie:${query}`,
    expiration: 3600 * 24,
  },
  TMDB_SEARCH_TV_SHOWS: {
    prefix: (query: string) => `tmdb:search:tvShow:${query}`,
    expiration: 3600 * 24,
  },
  TMDB_MOVIE_BY_ID: {
    prefix: (tmdbId: number) => `tmdb:movie:id:${tmdbId}`,
    expiration: 3600 * 24,
  },
  TMDB_TV_SHOW_BY_ID: {
    prefix: (tmdbId: number) => `tmdb:tvShow:id:${tmdbId}`,
    expiration: 3600 * 24,
  },
}