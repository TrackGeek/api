import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DEFAULT_PAGINATION_PAGE } from "@/shared/infra/database/database.service";
import { slugify } from "@/shared/utils/string";
import { CacheService } from "../cache/cache.service";

const TMDB_COMPANY_MEDIA_MAX_PAGES = 3;

export interface IGDBPagination<I> {
  total: number | null;
  pages: number;
  inPage: number;
  itemsInPage: number;
  itemsPerPage: number | null;
  items: I[];
}

export enum TMDBMovieFilter {
  Airing = "airing",
  Upcoming = "upcoming",
  Trending = "trending",
  Popular = "popular",
}

export enum TMDBTVShowFilter {
  Airing = "airing",
  Upcoming = "upcoming",
  Trending = "trending",
  Popular = "popular",
}

export enum TMDBTVShowOrderBy {
  Name = "name",
  FirstAirDate = "first_air_date",
  Score = "score",
}

export enum TMDBMovieOrderBy {
  Title = "title",
  ReleaseDate = "release_date",
  Score = "score",
}

export enum TMDBSort {
  Desc = "desc",
  Asc = "asc",
}

export interface TMDBSearchTVShowOptions {
  query?: string;
  page?: number;
  orderBy?: TMDBTVShowOrderBy;
  sort?: TMDBSort;
  genres?: string[];
  year?: string;
}

export interface TMDBSearchMovieOptions {
  query?: string;
  page?: number;
  orderBy?: TMDBMovieOrderBy;
  sort?: TMDBSort;
  genres?: string[];
  year?: string;
}

export interface TMDBTopMovieOptions {
  page?: number;
  filter: TMDBMovieFilter;
}

export interface TMDBTopTVShowsOptions {
  page?: number;
  filter: TMDBTVShowFilter;
}

export interface TMDBSearchMovieResult {
  tmdbId: number;
  title: string;
  backdropUrl: string | null;
  overview: string | null;
  releaseDate: Date | null;
  posterUrl: string | null;
}

export interface TMDBTopMovieResult {
  tmdbId: number;
  name: string;
  releaseDate: Date | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string | null;
}

export interface TMDBTopTVShowResult {
  tmdbId: number;
  name: string;
  firstAirDate: Date | null;
  posterUrl: string | null;
}

export interface TMDBSearchTVShowResult {
  tmdbId: number;
  name: string;
  firstAirDate: Date | null;
  posterUrl: string | null;
}

export interface TMDBMovieDetails {
  tmdbId: number;
  imdbId: string | null;
  isAdult: boolean;
  tmdbReviewScore: number;
  backdropUrl: string | null;
  belongsToCollection: {
    id: number;
    name: string;
  } | null;
  budget: string;
  genres: string[];
  homepage: string | null;
  originalLanguage: string;
  originalTitle: string;
  overview: string | null;
  popularity: number;
  posterUrl: string | null;
  productionCompanies: {
    id: number;
    logoUrl: string | null;
    name: string;
    originCountry: string;
  }[];
  productionCountries: string[];
  releaseDate: Date | null;
  revenue: string;
  runtime: number | null;
  spokenLanguages: {
    englishName: string;
    name: string;
    iso639_1: string;
  }[];
  status: string;
  title: string;
  cast: {
    id: number;
    name: string;
    character: string;
    profileUrl: string | null;
  }[];
  crew: {
    id: number;
    name: string;
    job: string;
    profileUrl: string | null;
  }[];
  trailerId: string | null;
  external: Record<string, unknown> | null;
  backdrops: string[];
}

export interface TMDBMovieCollectionPart {
  tmdbId: number;
  title: string;
  isAdult: boolean;
  overview: string | null;
  genres: string[];
  tmdbReviewScore: number;
  releaseDate: Date | null;
  posterUrl: string | null;
  backdropUrl: string | null;
}

export interface TMDBMovieCollection {
  id: number;
  name: string;
  slug: string;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  parts: TMDBMovieCollectionPart[];
}

export interface TMDBTVShowDetails {
  tmdbId: number;
  backdropUrl: string | null;
  createdBy: {
    id: number;
    name: string;
    profileUrl: string | null;
  }[];
  episodeRuntime: number[];
  firstAirDate: Date | null;
  genres: string[];
  homepage: string | null;
  inProduction: boolean;
  languages: string[];
  lastAirDate: Date | null;
  lastEpisodeToAir: {
    airDate: Date | null;
    episodeNumber: number;
    id: number;
    name: string;
    overview: string | null;
    seasonNumber: number;
    stillUrl: string | null;
  } | null;
  name: string;
  nextEpisodeToAir: {
    airDate: Date | null;
    episodeNumber: number;
    id: number;
    name: string;
    overview: string | null;
    seasonNumber: number;
    stillUrl: string | null;
  } | null;
  networks: {
    id: number;
    name: string;
    originCountry: string;
    logoUrl: string | null;
  }[];
  numberOfEpisodes: number;
  numberOfSeasons: number;
  originCountry: string[];
  originalLanguage: string;
  originalName: string;
  popularity: number;
  posterUrl: string | null;
  productionCompanies: {
    id: number;
    logoUrl: string | null;
    name: string;
    originCountry: string;
  }[];
  productionCountries: string[];
  status: string;
  tagline: string | null;
  type: string;
  cast: {
    id: number;
    name: string;
    character: string;
    profileUrl: string | null;
  }[];
  crew: {
    id: number;
    name: string;
    job: string;
    profileUrl: string | null;
  }[];
  trailerId: string | null;
  external: Record<string, unknown> | null;
  backdrops: string[];
}

export interface TMDBTVShowSeason {
  id: number;
  name: string;
  seasonNumber: number;
  airDate: Date | null;
  numberOfEpisodes: number;
  posterUrl: string | null;
}

export interface TMDBTVShowSeasonEpisode {
  episodeNumber: number;
  name: string;
  overview: string | null;
  airDate: Date | null;
  stillUrl: string | null;
}

export interface TMDBTVShowGenre {
  id: number;
  name: string;
}

export interface TMDBMovieGenre {
  id: number;
  name: string;
}

export interface TMDBPersonCredit {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: Date | null;
  tmdbReviewScore: number | null;
  popularity: number | null;
  isAdult: boolean;
  character: string | null;
  job: string | null;
  department: string | null;
  episodeCount: number | null;
}

export interface TMDBCompanyDetails {
  id: number;
  name: string;
  description: string | null;
  headquarters: string | null;
  homepage: string | null;
  logoUrl: string | null;
  originCountry: string | null;
  parentCompany: {
    id: number;
    name: string;
  } | null;
}

export interface TMDBCompanyMedia {
  tmdbId: number;
  title: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: Date | null;
  tmdbReviewScore: number | null;
  popularity: number | null;
  isAdult: boolean;
}

export interface TMDBPersonDetails {
  tmdbId: number;
  name: string;
  biography: string | null;
  birthday: Date | null;
  deathday: Date | null;
  placeOfBirth: string | null;
  knownForDepartment: string | null;
  alsoKnownAs: string[];
  gender: number | null;
  homepage: string | null;
  popularity: number | null;
  imageUrl: string | null;
  images: string[];
  external: Record<string, string | null>;
  cast: TMDBPersonCredit[];
  crew: TMDBPersonCredit[];
}

export type TMDBWatchMediaType = "movie" | "tv";

export const TMDB_WATCH_PROVIDER_OFFERS = ["flatrate", "free", "ads", "rent", "buy"] as const;

export type TMDBWatchProviderOffer = (typeof TMDB_WATCH_PROVIDER_OFFERS)[number];

export interface TMDBWatchProvider {
  id: number;
  name: string;
  logoUrl: string | null;
  displayPriority: number | null;
}

export type TMDBWatchProviderOffers = Record<TMDBWatchProviderOffer, TMDBWatchProvider[]>;

export interface TMDBRegionWatchProviders extends TMDBWatchProviderOffers {
  link: string | null;
}

export interface TMDBWatchProviders extends TMDBRegionWatchProviders {
  region: string;
  availableRegions: string[];
}

export interface TMDBWatchProviderRegion {
  code: string;
  name: string;
  nativeName: string;
}

export const TMDB_DEFAULT_WATCH_REGION = "US";

@Injectable()
export class TMDBService {
  private readonly logger = new Logger(TMDBService.name);

  private readonly TMDB_API_URL = "https://api.themoviedb.org/3";

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  /** Genre filters arrive as display names from the UI, but TMDB only matches numeric ids. */
  private toGenreIds(values: string[] | undefined, catalog: { id: number; name: string }[]): number[] | undefined {
    if (!values?.length) return undefined;

    const ids = values
      .map((value) => {
        if (/^\d+$/.test(value)) return Number(value);

        return catalog.find((genre) => genre.name.toLowerCase() === value.toLowerCase())?.id ?? null;
      })
      .filter((id): id is number => id !== null);

    return ids.length ? ids : undefined;
  }

  async searchTVShows({
    query = "A",
    page = DEFAULT_PAGINATION_PAGE,
    orderBy,
    sort = TMDBSort.Desc,
    genres,
    year,
  }: TMDBSearchTVShowOptions): Promise<IGDBPagination<TMDBSearchTVShowResult>> {
    try {
      const cachedTVShowsKey = CACHE_KEYS.TMDB_SEARCH_TV_SHOWS.prefix({ query, page, orderBy, sort, genres, year });
      const cachedTVShows = await this.cacheService.get<IGDBPagination<TMDBSearchTVShowResult>>(cachedTVShowsKey);

      if (cachedTVShows) {
        return cachedTVShows;
      }

      const tvShowsResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/search/tv`, {
          params: { query, page, first_air_date_year: year },
          headers: {
            Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
          },
        }),
      );

      const tvShowsData = tvShowsResponse.data;

      const tvShowGenres = await this.getTVShowGenres();

      let items = tvShowsData.results.map((tvShow: any) => ({
        tmdbId: tvShow.id,
        name: tvShow.name,
        isAdult: tvShow.adult,
        genres: tvShow.genre_ids
          .map((genre: any) => tvShowGenres.find((g) => g.id === genre) ?? null)
          .filter((g: any) => g) as string[],
        tmdbReviewScore: tvShow.vote_average,
        firstAirDate: tvShow.first_air_date ? new Date(tvShow.first_air_date) : null,
        posterUrl: tvShow.poster_path ? `https://image.tmdb.org/t/p/w500${tvShow.poster_path}` : null,
      }));

      const effectiveOrderBy = orderBy ?? TMDBTVShowOrderBy.Score;

      const genreIds = this.toGenreIds(genres, tvShowGenres);

      if (genreIds?.length) {
        items = items.filter((item: any) => genreIds.every((id) => item.genres.some((g: any) => g.id === id)));
      }

      items = items.sort((a: any, b: any) => {
        let aVal: any;
        let bVal: any;

        if (effectiveOrderBy === TMDBTVShowOrderBy.Name) {
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
        } else if (effectiveOrderBy === TMDBTVShowOrderBy.FirstAirDate) {
          aVal = a.firstAirDate?.getTime() ?? 0;
          bVal = b.firstAirDate?.getTime() ?? 0;
        } else {
          aVal = a.tmdbReviewScore ?? 0;
          bVal = b.tmdbReviewScore ?? 0;
        }

        if (aVal < bVal) return sort === TMDBSort.Asc ? -1 : 1;
        if (aVal > bVal) return sort === TMDBSort.Asc ? 1 : -1;

        return 0;
      });

      const tvShows: IGDBPagination<TMDBSearchTVShowResult> = {
        total: null,
        pages: tvShowsData.total_pages,
        inPage: page,
        itemsInPage: items.length,
        itemsPerPage: null,
        items,
      };

      await this.cacheService.set(cachedTVShowsKey, tvShows, CACHE_KEYS.TMDB_SEARCH_TV_SHOWS.expiration);

      return tvShows;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.TV_SHOW_NOT_FOUND);
      }

      this.logger.error(`Failed to search TV shows from TMDB API for query "${query}": ${error.message}`, error.stack);

      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  async searchMovies({
    query = "A",
    page = DEFAULT_PAGINATION_PAGE,
    orderBy,
    sort = TMDBSort.Desc,
    genres,
    year,
  }: TMDBSearchMovieOptions): Promise<IGDBPagination<TMDBSearchMovieResult>> {
    try {
      const cachedMoviesKey = CACHE_KEYS.TMDB_SEARCH_MOVIES.prefix({ query, page, orderBy, sort, genres, year });

      const cachedMovies = await this.cacheService.get<IGDBPagination<TMDBSearchMovieResult>>(cachedMoviesKey);

      if (cachedMovies) {
        return cachedMovies;
      }

      const movieResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/search/movie`, {
          params: { query, page, primary_release_year: year },
          headers: {
            Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
          },
        }),
      );

      const moviesData = movieResponse.data;

      const movieGenres = await this.getMovieGenres();

      let items: TMDBSearchMovieResult[] = moviesData.results.map((movie: any) => ({
        tmdbId: movie.id,
        title: movie.title,
        isAdult: movie.adult,
        genres: movie.genre_ids
          .map((genre: any) => movieGenres.find((g) => g.id === genre) ?? null)
          .filter((g: any) => g) as string[],
        tmdbReviewScore: movie.vote_average,
        releaseDate: movie.release_date ? new Date(movie.release_date) : null,
        posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      }));

      const genreIds = this.toGenreIds(genres, movieGenres);

      if (genreIds?.length) {
        items = items.filter((item: any) => genreIds.every((id) => item.genres.some((g: any) => g.id === id)));
      }

      const effectiveOrderBy = orderBy ?? TMDBMovieOrderBy.Score;

      items = items.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        if (effectiveOrderBy === TMDBMovieOrderBy.Title) {
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
        } else if (effectiveOrderBy === TMDBMovieOrderBy.ReleaseDate) {
          aVal = a.releaseDate?.getTime() ?? 0;
          bVal = b.releaseDate?.getTime() ?? 0;
        } else {
          aVal = (a as any).tmdbReviewScore ?? 0;
          bVal = (b as any).tmdbReviewScore ?? 0;
        }

        if (aVal < bVal) return sort === TMDBSort.Asc ? -1 : 1;
        if (aVal > bVal) return sort === TMDBSort.Asc ? 1 : -1;
        return 0;
      });

      const movies: IGDBPagination<TMDBSearchMovieResult> = {
        total: null,
        pages: moviesData.total_pages,
        inPage: page,
        itemsInPage: items.length,
        itemsPerPage: null,
        items,
      };

      await this.cacheService.set<IGDBPagination<TMDBSearchMovieResult>>(
        cachedMoviesKey,
        movies,
        CACHE_KEYS.TMDB_SEARCH_MOVIES.expiration,
      );

      return movies;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.MOVIE_NOT_FOUND);
      }

      this.logger.error(`Failed to search movies from TMDB API for query "${query}": ${error.message}`, error.stack);

      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  async getTVShowGenres() {
    try {
      const cachedGenresKey = CACHE_KEYS.TMDB_TV_SHOW_GENRES.prefix;

      const cachedGenres = await this.cacheService.get<TMDBTVShowGenre[]>(cachedGenresKey);

      if (cachedGenres) {
        return cachedGenres;
      }

      const genresResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/genre/tv/list`, {
          headers: {
            Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
          },
        }),
      );

      const genresData = genresResponse.data;

      const genres: TMDBTVShowGenre[] = genresData.genres.map((genre: any) => ({
        id: genre.id,
        name: genre.name,
      }));

      await this.cacheService.set<TMDBTVShowGenre[]>(
        cachedGenresKey,
        genres,
        CACHE_KEYS.TMDB_TV_SHOW_GENRES.expiration,
      );

      return genres;
    } catch (error: any) {
      this.logger.error(`Failed to fetch TV show genres from TMDB API: ${error.message}`, error.stack);

      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  async getMovieGenres() {
    try {
      const cachedGenresKey = CACHE_KEYS.TMDB_MOVIE_GENRES.prefix;

      const cachedGenres = await this.cacheService.get<TMDBMovieGenre[]>(cachedGenresKey);

      if (cachedGenres) {
        return cachedGenres;
      }

      const genresResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/genre/movie/list`, {
          headers: {
            Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
          },
        }),
      );

      const genresData = genresResponse.data;

      const genres: TMDBMovieGenre[] = genresData.genres.map((genre: any) => ({
        id: genre.id,
        name: genre.name,
      }));

      await this.cacheService.set<TMDBMovieGenre[]>(cachedGenresKey, genres, CACHE_KEYS.TMDB_MOVIE_GENRES.expiration);

      return genres;
    } catch (error: any) {
      this.logger.error(`Failed to fetch movie genres from TMDB API: ${error.message}`, error.stack);

      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  async topMovies({
    page = DEFAULT_PAGINATION_PAGE,
    filter,
  }: TMDBTopMovieOptions): Promise<IGDBPagination<TMDBTopMovieResult>> {
    const TMDB_MOVIE_FILTER_PATH: Record<TMDBMovieFilter, string> = {
      [TMDBMovieFilter.Airing]: "movie/now_playing",
      [TMDBMovieFilter.Upcoming]: "discover/movie",
      [TMDBMovieFilter.Trending]: "trending/movie/day",
      [TMDBMovieFilter.Popular]: "movie/popular",
    };

    try {
      const topMoviesOptions = { page, filter };
      const topMoviesKey = CACHE_KEYS.TMDB_TOP_MOVIES.prefix({ ...topMoviesOptions });

      const cachedTopMovies = await this.cacheService.get<IGDBPagination<TMDBTopMovieResult>>(topMoviesKey);
      if (cachedTopMovies) return cachedTopMovies;

      const path = TMDB_MOVIE_FILTER_PATH[filter];
      const params: Record<string, any> = { page };

      if (filter === TMDBMovieFilter.Upcoming) {
        const today = new Date();
        const futureDate = new Date();

        futureDate.setMonth(today.getMonth() + 3);

        const toISO = (d: Date) => d.toISOString().split("T")[0];

        params["primary_release_date.gte"] = toISO(today);
        params["primary_release_date.lte"] = toISO(futureDate);
      }

      const topMovieResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/${path}`, {
          params,
          headers: {
            Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
          },
        }),
      );

      const responseData = topMovieResponse.data;

      const items: TMDBTopMovieResult[] = responseData.results.map((movie: any) => ({
        tmdbId: movie.id,
        name: movie.title,
        releaseDate: movie.release_date ? new Date(movie.release_date) : null,
        backdropUrl: movie.backdrop_path
          ? `https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${movie.backdrop_path}`
          : null,
        overview: movie.overview,
        posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      }));

      const topMovies: IGDBPagination<TMDBTopMovieResult> = {
        total: null,
        pages: responseData.total_pages,
        inPage: page,
        itemsInPage: items.length,
        itemsPerPage: null,
        items,
      };

      await this.cacheService.set(topMoviesKey, topMovies, CACHE_KEYS.TMDB_TOP_MOVIES.expiration);

      return topMovies;
    } catch (error: any) {
      this.logger.error("Failed to fetch top movies from TMDB API", error);
      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  async topTVShows({
    page = DEFAULT_PAGINATION_PAGE,
    filter,
  }: TMDBTopTVShowsOptions): Promise<IGDBPagination<TMDBTopTVShowResult>> {
    const TMDB_TV_SHOWS_FILTER_PATH: Record<TMDBTVShowFilter, string> = {
      [TMDBTVShowFilter.Airing]: "tv/airing_today",
      [TMDBTVShowFilter.Upcoming]: "discover/tv",
      [TMDBTVShowFilter.Trending]: "trending/tv/day",
      [TMDBTVShowFilter.Popular]: "tv/popular",
    };

    try {
      const topTVShowsOptions = { page, filter };
      const topTVShowsKey = CACHE_KEYS.TMDB_TOP_TV_SHOWS.prefix({ ...topTVShowsOptions });

      const cachedTopTVShows = await this.cacheService.get<IGDBPagination<TMDBTopTVShowResult>>(topTVShowsKey);

      if (cachedTopTVShows) {
        return cachedTopTVShows;
      }

      const path = TMDB_TV_SHOWS_FILTER_PATH[filter];
      const params: Record<string, any> = { page };

      if (filter === TMDBTVShowFilter.Upcoming) {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setMonth(today.getMonth() + 3);
        const toISO = (d: Date) => d.toISOString().split("T")[0];

        params["air_date.gte"] = toISO(today);
        params["air_date.lte"] = toISO(futureDate);
      }

      const topTVShowsResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/${path}`, {
          params,
          headers: {
            Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
          },
        }),
      );

      const tvShowsData = topTVShowsResponse.data;

      const items: TMDBTopTVShowResult[] = tvShowsData.results.map((tvShow: any) => ({
        tmdbId: tvShow.id,
        name: tvShow.name,
        isAdult: tvShow.adult,
        tmdbReviewScore: tvShow.vote_average,
        firstAirDate: tvShow.first_air_date ? new Date(tvShow.first_air_date) : null,
        posterUrl: tvShow.poster_path ? `https://image.tmdb.org/t/p/w500${tvShow.poster_path}` : null,
        backdropUrl: tvShow.backdrop_path
          ? `https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${tvShow.backdrop_path}`
          : null,
        tagline: tvShow.overview,
      }));

      const topTVShows: IGDBPagination<TMDBTopTVShowResult> = {
        total: null,
        pages: tvShowsData.total_pages,
        inPage: page,
        itemsInPage: items.length,
        itemsPerPage: null,
        items,
      };

      await this.cacheService.set<IGDBPagination<TMDBTopTVShowResult>>(
        topTVShowsKey,
        topTVShows,
        CACHE_KEYS.TMDB_TOP_TV_SHOWS.expiration,
      );

      return topTVShows;
    } catch (error: any) {
      this.logger.error("Failed to fetch top TV shows from TMDB API", error);
      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  async getMovieById(tmdbId: number): Promise<TMDBMovieDetails> {
    try {
      const cachedMovie = await this.cacheService.get<TMDBMovieDetails>(CACHE_KEYS.TMDB_MOVIE_BY_ID.prefix(tmdbId));

      if (cachedMovie) {
        return cachedMovie;
      }

      const movieResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/movie/${tmdbId}`, {
          params: {
            append_to_response: "credits,videos,external_ids,images",
          },
          headers: {
            Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
          },
        }),
      );

      const movieData = movieResponse.data;

      const movieCredits = movieData.credits ?? { cast: [], crew: [] };
      const movieVideos = movieData.videos?.results ?? [];
      const movieBackdrops = movieData.images?.backdrops ?? [];

      const movie: TMDBMovieDetails = {
        tmdbId: movieData.id,
        imdbId: movieData.imdb_id,
        backdropUrl: movieData.backdrop_path ? `https://image.tmdb.org/t/p/w500${movieData.backdrop_path}` : null,
        belongsToCollection: movieData.belongs_to_collection
          ? {
              id: movieData.belongs_to_collection.id,
              name: movieData.belongs_to_collection.name,
            }
          : null,
        budget: movieData.budget.toString(),
        isAdult: movieData.adult,
        genres: movieData.genres.map((genre: any) => genre.name),
        homepage: movieData.homepage,
        originalLanguage: movieData.original_language,
        originalTitle: movieData.original_title,
        overview: movieData.overview,
        popularity: movieData.popularity,
        posterUrl: movieData.poster_path ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}` : null,
        productionCompanies: movieData.production_companies.map((company: any) => ({
          id: company.id,
          logoUrl: company.logo_path ? `https://image.tmdb.org/t/p/w500${company.logo_path}` : null,
          name: company.name,
          originCountry: company.origin_country,
        })),
        productionCountries: movieData.production_countries.map((country: any) => country.name),
        releaseDate: movieData.release_date ? new Date(movieData.release_date) : null,
        revenue: movieData.revenue.toString(),
        runtime: movieData.runtime,
        spokenLanguages: movieData.spoken_languages.map((lang: any) => ({
          englishName: lang.english_name,
          name: lang.name,
          iso639_1: lang.iso_639_1,
        })),
        status: movieData.status,
        title: movieData.title,
        cast: movieCredits.cast.map((castMember: any) => ({
          id: castMember.id,
          name: castMember.name,
          character: castMember.character,
          profileUrl: castMember.profile_path ? `https://image.tmdb.org/t/p/w500${castMember.profile_path}` : null,
        })),
        crew: movieCredits.crew.map((crewMember: any) => ({
          id: crewMember.id,
          name: crewMember.name,
          job: crewMember.job,
          profileUrl: crewMember.profile_path ? `https://image.tmdb.org/t/p/w500${crewMember.profile_path}` : null,
        })),
        trailerId: movieVideos.find((video: any) => video.site === "YouTube" && video.type === "Trailer")?.key ?? null,
        backdrops: movieBackdrops.map(
          (backdrop: any) => `https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${backdrop.file_path}`,
        ),
        external: movieData.external_ids,
        tmdbReviewScore: movieData.vote_average,
      };

      await this.cacheService.set(
        CACHE_KEYS.TMDB_MOVIE_BY_ID.prefix(tmdbId),
        movie,
        CACHE_KEYS.TMDB_MOVIE_BY_ID.expiration,
      );

      return movie;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.MOVIE_NOT_FOUND);
      }

      this.logger.error(`Failed to fetch movie details for ID ${tmdbId} from TMDB API: ${error.message}`, error.stack);

      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  async getMovieCollectionById(collectionId: number): Promise<TMDBMovieCollection> {
    try {
      const cachedCollectionKey = CACHE_KEYS.TMDB_MOVIE_COLLECTION_BY_ID.prefix(collectionId);

      const cachedCollection = await this.cacheService.get<TMDBMovieCollection>(cachedCollectionKey);

      if (cachedCollection) {
        return cachedCollection;
      }

      const collectionResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/collection/${collectionId}`, {
          headers: {
            Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
          },
        }),
      );

      const collectionData = collectionResponse.data;

      const movieGenres = await this.getMovieGenres();

      const parts: TMDBMovieCollectionPart[] = (collectionData.parts ?? [])
        .map((part: any) => ({
          tmdbId: part.id,
          title: part.title,
          isAdult: part.adult,
          overview: part.overview || null,
          genres: (part.genre_ids ?? [])
            .map((genre: any) => movieGenres.find((g) => g.id === genre) ?? null)
            .filter((g: any) => g),
          tmdbReviewScore: part.vote_average,
          releaseDate: part.release_date ? new Date(part.release_date) : null,
          posterUrl: part.poster_path ? `https://image.tmdb.org/t/p/w500${part.poster_path}` : null,
          backdropUrl: part.backdrop_path
            ? `https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${part.backdrop_path}`
            : null,
        }))
        .sort(
          (a: TMDBMovieCollectionPart, b: TMDBMovieCollectionPart) =>
            (a.releaseDate?.getTime() ?? Number.MAX_SAFE_INTEGER) -
            (b.releaseDate?.getTime() ?? Number.MAX_SAFE_INTEGER),
        );

      const collection: TMDBMovieCollection = {
        id: collectionData.id,
        name: collectionData.name,
        slug: slugify(collectionData.name ?? ""),
        overview: collectionData.overview || null,
        posterUrl: collectionData.poster_path ? `https://image.tmdb.org/t/p/w500${collectionData.poster_path}` : null,
        backdropUrl: collectionData.backdrop_path
          ? `https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${collectionData.backdrop_path}`
          : (parts.find((part) => part.backdropUrl)?.backdropUrl ?? null),
        parts,
      };

      await this.cacheService.set(cachedCollectionKey, collection, CACHE_KEYS.TMDB_MOVIE_COLLECTION_BY_ID.expiration);

      return collection;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.MOVIE_FRANCHISE_NOT_FOUND);
      }

      this.logger.error(
        `Failed to fetch movie collection ${collectionId} from TMDB API: ${error.message}`,
        error.stack,
      );

      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  async getCompanyById(companyId: number): Promise<TMDBCompanyDetails> {
    try {
      const cachedCompanyKey = CACHE_KEYS.TMDB_COMPANY_BY_ID.prefix(companyId);

      const cachedCompany = await this.cacheService.get<TMDBCompanyDetails>(cachedCompanyKey);

      if (cachedCompany) {
        return cachedCompany;
      }

      const companyResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/company/${companyId}`, {
          headers: {
            Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
          },
        }),
      );

      const companyData = companyResponse.data;

      const company: TMDBCompanyDetails = {
        id: companyData.id,
        name: companyData.name,
        description: companyData.description || null,
        headquarters: companyData.headquarters || null,
        homepage: companyData.homepage || null,
        logoUrl: companyData.logo_path ? `https://image.tmdb.org/t/p/w500${companyData.logo_path}` : null,
        originCountry: companyData.origin_country || null,
        parentCompany: companyData.parent_company
          ? { id: companyData.parent_company.id, name: companyData.parent_company.name }
          : null,
      };

      await this.cacheService.set(cachedCompanyKey, company, CACHE_KEYS.TMDB_COMPANY_BY_ID.expiration);

      return company;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.COMPANY_NOT_FOUND);
      }

      this.logger.error(`Failed to fetch company ${companyId} from TMDB API: ${error.message}`, error.stack);

      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  /** Discover only returns 20 items per page, so a few pages are merged to build a representative catalog. */
  async getCompanyMedia(companyId: number, mediaType: "movie" | "tv"): Promise<TMDBCompanyMedia[]> {
    try {
      const cachedMediaKey = CACHE_KEYS.TMDB_COMPANY_MEDIA_BY_ID.prefix(companyId, mediaType);

      const cachedMedia = await this.cacheService.get<TMDBCompanyMedia[]>(cachedMediaKey);

      if (cachedMedia) {
        return cachedMedia;
      }

      const discover = (page: number) =>
        firstValueFrom(
          this.httpService.get(`${this.TMDB_API_URL}/discover/${mediaType}`, {
            params: {
              with_companies: companyId,
              sort_by: "popularity.desc",
              include_adult: false,
              page,
            },
            headers: {
              Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
            },
          }),
        );

      const firstPage = await discover(DEFAULT_PAGINATION_PAGE);
      const lastPage = Math.min(firstPage.data.total_pages ?? 1, TMDB_COMPANY_MEDIA_MAX_PAGES);

      const remainingPages = await Promise.all(
        Array.from({ length: Math.max(lastPage - 1, 0) }, (_, index) => discover(index + 2)),
      );

      const results = [firstPage, ...remainingPages].flatMap((response) => response.data.results ?? []);

      const media: TMDBCompanyMedia[] = results
        .map((result: any) => {
          const releaseDate = mediaType === "movie" ? result.release_date : result.first_air_date;

          return {
            tmdbId: result.id,
            title: mediaType === "movie" ? result.title : result.name,
            posterUrl: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null,
            backdropUrl: result.backdrop_path
              ? `https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${result.backdrop_path}`
              : null,
            releaseDate: releaseDate ? new Date(releaseDate) : null,
            tmdbReviewScore: result.vote_average ?? null,
            popularity: result.popularity ?? null,
            isAdult: result.adult ?? false,
          };
        })
        .sort(
          (a: TMDBCompanyMedia, b: TMDBCompanyMedia) =>
            (b.releaseDate?.getTime() ?? 0) - (a.releaseDate?.getTime() ?? 0),
        );

      await this.cacheService.set(cachedMediaKey, media, CACHE_KEYS.TMDB_COMPANY_MEDIA_BY_ID.expiration);

      return media;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.COMPANY_NOT_FOUND);
      }

      this.logger.error(
        `Failed to fetch ${mediaType} for company ${companyId} from TMDB API: ${error.message}`,
        error.stack,
      );

      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  async getTVShowById(tmdbId: number): Promise<TMDBTVShowDetails> {
    try {
      const cachedTVShow = await this.cacheService.get<TMDBTVShowDetails>(CACHE_KEYS.TMDB_TV_SHOW_BY_ID.prefix(tmdbId));

      if (cachedTVShow) {
        return cachedTVShow;
      }

      const tvShowResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/tv/${tmdbId}`, {
          params: {
            append_to_response: "credits,videos,external_ids,images",
          },
          headers: {
            Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
          },
        }),
      );

      const tvShowData = tvShowResponse.data;
      const tvShowCredits = tvShowData.credits ?? { cast: [], crew: [] };
      const tvShowVideos = tvShowData.videos?.results ?? [];
      const tvShowBackdrops = tvShowData.images?.backdrops ?? [];

      const tvShow: TMDBTVShowDetails = {
        tmdbId: tvShowData.id,
        isAdult: tvShowData.adult,
        backdropUrl: tvShowData.backdrop_path ? `https://image.tmdb.org/t/p/w500${tvShowData.backdrop_path}` : null,
        createdBy: tvShowData.created_by.map((creator: any) => ({
          id: creator.id,
          name: creator.name,
          profileUrl: creator.profile_path ? `https://image.tmdb.org/t/p/w500${creator.profile_path}` : null,
        })),
        episodeRuntime: tvShowData.episode_run_time,
        firstAirDate: tvShowData.first_air_date ? new Date(tvShowData.first_air_date) : null,
        genres: tvShowData.genres.map((genre: any) => genre.name),
        homepage: tvShowData.homepage,
        inProduction: tvShowData.in_production,
        languages: tvShowData.languages,
        lastAirDate: tvShowData.last_air_date ? new Date(tvShowData.last_air_date) : null,
        lastEpisodeToAir: tvShowData.last_episode_to_air
          ? {
              airDate: tvShowData.last_episode_to_air.air_date
                ? new Date(tvShowData.last_episode_to_air.air_date)
                : null,
              episodeNumber: tvShowData.last_episode_to_air.episode_number,
              id: tvShowData.last_episode_to_air.id,
              name: tvShowData.last_episode_to_air.name,
              overview: tvShowData.last_episode_to_air.overview,
              seasonNumber: tvShowData.last_episode_to_air.season_number,
              stillUrl: tvShowData.last_episode_to_air.still_path
                ? `https://image.tmdb.org/t/p/w500${tvShowData.last_episode_to_air.still_path}`
                : null,
            }
          : null,
        name: tvShowData.name,
        nextEpisodeToAir: tvShowData.next_episode_to_air
          ? {
              airDate: tvShowData.next_episode_to_air.air_date
                ? new Date(tvShowData.next_episode_to_air.air_date)
                : null,
              episodeNumber: tvShowData.next_episode_to_air.episode_number,
              id: tvShowData.next_episode_to_air.id,
              name: tvShowData.next_episode_to_air.name,
              overview: tvShowData.next_episode_to_air.overview,
              seasonNumber: tvShowData.next_episode_to_air.season_number,
              stillUrl: tvShowData.next_episode_to_air.still_path
                ? `https://image.tmdb.org/t/p/w500${tvShowData.next_episode_to_air.still_path}`
                : null,
            }
          : null,
        networks: tvShowData.networks.map((network: any) => ({
          id: network.id,
          name: network.name,
          originCountry: network.origin_country,
          logoUrl: network.logo_path ? `https://image.tmdb.org/t/p/w500${network.logo_path}` : null,
        })),
        numberOfEpisodes: tvShowData.number_of_episodes,
        numberOfSeasons: tvShowData.number_of_seasons,
        originCountry: tvShowData.origin_country,
        originalLanguage: tvShowData.original_language,
        originalName: tvShowData.original_name,
        popularity: tvShowData.popularity,
        posterUrl: tvShowData.poster_path ? `https://image.tmdb.org/t/p/w500${tvShowData.poster_path}` : null,
        productionCompanies: tvShowData.production_companies.map((company: any) => ({
          id: company.id,
          logoUrl: company.logo_path ? `https://image.tmdb.org/t/p/w500${company.logo_path}` : null,
          name: company.name,
          originCountry: company.origin_country,
        })),
        productionCountries: tvShowData.production_countries.map((country: any) => country.name),
        status: tvShowData.status,
        tagline: tvShowData.tagline,
        type: tvShowData.type,
        cast: tvShowCredits.cast.map((castMember: any) => ({
          id: castMember.id,
          name: castMember.name,
          character: castMember.character,
          profileUrl: castMember.profile_path ? `https://image.tmdb.org/t/p/w500${castMember.profile_path}` : null,
        })),
        crew: tvShowCredits.crew.map((crewMember: any) => ({
          id: crewMember.id,
          name: crewMember.name,
          job: crewMember.job,
          profileUrl: crewMember.profile_path ? `https://image.tmdb.org/t/p/w500${crewMember.profile_path}` : null,
        })),
        backdrops: tvShowBackdrops.map(
          (backdrop: any) => `https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${backdrop.file_path}`,
        ),
        trailerId: tvShowVideos.find((video: any) => video.site === "YouTube" && video.type === "Trailer")?.key ?? null,
        external: tvShowData.external_ids,
        tmdbReviewScore: tvShowData.vote_average,
      } as TMDBTVShowDetails;

      await this.cacheService.set(
        CACHE_KEYS.TMDB_TV_SHOW_BY_ID.prefix(tmdbId),
        tvShow,
        CACHE_KEYS.TMDB_TV_SHOW_BY_ID.expiration,
      );

      return tvShow;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.TV_SHOW_NOT_FOUND);
      }

      this.logger.error(
        `Failed to fetch TV show details for ID ${tmdbId} from TMDB API: ${error.message}`,
        error.stack,
      );

      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  async getTVShowSeasonsById(id: number): Promise<TMDBTVShowSeason[]> {
    try {
      const cachedTVShow = await this.cacheService.get<TMDBTVShowSeason[]>(
        CACHE_KEYS.TMDB_TV_SHOW_SEASONS_BY_ID.prefix(id),
      );

      if (cachedTVShow) {
        return cachedTVShow;
      }

      const tvShowResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/tv/${id}`, {
          headers: {
            Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
          },
        }),
      );

      const tvShowData = tvShowResponse.data;

      const seasons = tvShowData.seasons.map((season: any) => ({
        id: season.id,
        name: season.name,
        seasonNumber: season.season_number,
        numberOfEpisodes: season.episode_count,
        airDate: season.air_date ? new Date(season.air_date) : null,
        posterUrl: season.poster_path ? `https://image.tmdb.org/t/p/w500${season.poster_path}` : null,
      }));

      await this.cacheService.set(
        CACHE_KEYS.TMDB_TV_SHOW_SEASONS_BY_ID.prefix(id),
        seasons,
        CACHE_KEYS.TMDB_TV_SHOW_SEASONS_BY_ID.expiration,
      );

      return seasons;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.TV_SHOW_NOT_FOUND);
      }

      this.logger.error(`Failed to fetch TV show seasons for ID ${id} from TMDB API: ${error.message}`, error.stack);

      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  async getTVShowSeasonEpisdoesById(tmdbId: number, seasonId: number): Promise<TMDBTVShowSeasonEpisode[]> {
    try {
      const cachedEpisodes = await this.cacheService.get<TMDBTVShowSeasonEpisode[]>(
        CACHE_KEYS.TMDB_TV_SHOW_SEASON_EPISODES_BY_ID.prefix(tmdbId, seasonId),
      );

      if (cachedEpisodes) {
        return cachedEpisodes;
      }

      const seasonResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/tv/${tmdbId}/season/${seasonId}`, {
          headers: {
            Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
          },
        }),
      );

      const seasonData = seasonResponse.data;

      const episodes = seasonData.episodes.map((episode: any) => ({
        seasonNumber: seasonData.season_number,
        episodeNumber: episode.episode_number,
        name: episode.name,
        overview: episode.overview,
        airDate: episode.air_date ? new Date(episode.air_date) : null,
        stillUrl: episode.still_path ? `https://image.tmdb.org/t/p/w500${episode.still_path}` : null,
      }));

      await this.cacheService.set(
        CACHE_KEYS.TMDB_TV_SHOW_SEASON_EPISODES_BY_ID.prefix(tmdbId, seasonId),
        episodes,
        CACHE_KEYS.TMDB_TV_SHOW_SEASON_EPISODES_BY_ID.expiration,
      );

      return episodes;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.TV_SHOW_NOT_FOUND);
      }

      this.logger.error(
        `Failed to fetch TV show seasons for ID ${tmdbId} season ${seasonId} from TMDB API: ${error.message}`,
        error.stack,
      );

      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  async getPersonById(tmdbId: number): Promise<TMDBPersonDetails> {
    try {
      const cachedPerson = await this.cacheService.get<TMDBPersonDetails>(CACHE_KEYS.TMDB_PERSON_BY_ID.prefix(tmdbId));

      if (cachedPerson) {
        return cachedPerson;
      }

      const personResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/person/${tmdbId}`, {
          params: {
            append_to_response: "combined_credits,external_ids,images",
          },
          headers: {
            Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
          },
        }),
      );

      const personData = personResponse.data;
      const combinedCredits = personData.combined_credits ?? { cast: [], crew: [] };

      const toCredit = (credit: any): TMDBPersonCredit | null => {
        const mediaType = credit.media_type === "tv" ? "tv" : credit.media_type === "movie" ? "movie" : null;

        if (!mediaType) {
          return null;
        }

        const date = mediaType === "movie" ? credit.release_date : credit.first_air_date;

        return {
          tmdbId: credit.id,
          mediaType,
          title: mediaType === "movie" ? credit.title : credit.name,
          posterUrl: credit.poster_path ? `https://image.tmdb.org/t/p/w500${credit.poster_path}` : null,
          backdropUrl: credit.backdrop_path
            ? `https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${credit.backdrop_path}`
            : null,
          releaseDate: date ? new Date(date) : null,
          tmdbReviewScore: credit.vote_average ?? null,
          popularity: credit.popularity ?? null,
          isAdult: !!credit.adult,
          character: credit.character || null,
          job: credit.job || null,
          department: credit.department || null,
          episodeCount: credit.episode_count ?? null,
        };
      };

      const dedupe = (credits: TMDBPersonCredit[]) => {
        const byKey = new Map<string, TMDBPersonCredit>();

        for (const credit of credits) {
          const key = `${credit.mediaType}:${credit.tmdbId}:${credit.job ?? credit.character ?? ""}`;

          if (!byKey.has(key)) {
            byKey.set(key, credit);
          }
        }

        return [...byKey.values()];
      };

      const person: TMDBPersonDetails = {
        tmdbId: personData.id,
        name: personData.name,
        biography: personData.biography || null,
        birthday: personData.birthday ? new Date(personData.birthday) : null,
        deathday: personData.deathday ? new Date(personData.deathday) : null,
        placeOfBirth: personData.place_of_birth || null,
        knownForDepartment: personData.known_for_department || null,
        alsoKnownAs: personData.also_known_as ?? [],
        gender: personData.gender ?? null,
        homepage: personData.homepage || null,
        popularity: personData.popularity ?? null,
        imageUrl: personData.profile_path ? `https://image.tmdb.org/t/p/w500${personData.profile_path}` : null,
        images: (personData.images?.profiles ?? []).map(
          (profile: any) => `https://image.tmdb.org/t/p/w500${profile.file_path}`,
        ),
        external: personData.external_ids ?? {},
        cast: dedupe((combinedCredits.cast ?? []).map(toCredit).filter(Boolean)),
        crew: dedupe((combinedCredits.crew ?? []).map(toCredit).filter(Boolean)),
      };

      await this.cacheService.set(
        CACHE_KEYS.TMDB_PERSON_BY_ID.prefix(tmdbId),
        person,
        CACHE_KEYS.TMDB_PERSON_BY_ID.expiration,
      );

      return person;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.PERSON_NOT_FOUND);
      }

      this.logger.error(`Failed to fetch person details for ID ${tmdbId} from TMDB API: ${error.message}`, error.stack);

      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  private toWatchProviders(offers: any): TMDBWatchProvider[] {
    return (offers ?? [])
      .map((offer: any) => ({
        id: offer.provider_id,
        name: offer.provider_name,
        logoUrl: offer.logo_path ? `https://image.tmdb.org/t/p/w185${offer.logo_path}` : null,
        displayPriority: offer.display_priority ?? null,
      }))
      .sort(
        (a: TMDBWatchProvider, b: TMDBWatchProvider) =>
          (a.displayPriority ?? Number.MAX_SAFE_INTEGER) - (b.displayPriority ?? Number.MAX_SAFE_INTEGER),
      );
  }

  /**
   * TMDB returns every region in a single call, so the whole map is cached at once and sliced per
   * region afterwards. Availability moves between services often, hence the short 3 day expiration.
   */
  private async getWatchProvidersByMedia(
    mediaType: TMDBWatchMediaType,
    tmdbId: number,
  ): Promise<Record<string, TMDBRegionWatchProviders>> {
    const cachedKey = CACHE_KEYS.TMDB_WATCH_PROVIDERS_BY_ID.prefix(mediaType, tmdbId);
    const cached = await this.cacheService.get<Record<string, TMDBRegionWatchProviders>>(cachedKey);

    if (cached) {
      return cached;
    }

    const providersResponse = await firstValueFrom(
      this.httpService.get(`${this.TMDB_API_URL}/${mediaType}/${tmdbId}/watch/providers`, {
        headers: {
          Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
        },
      }),
    );

    const results = providersResponse.data?.results ?? {};

    const providersByRegion = Object.entries(results).reduce<Record<string, TMDBRegionWatchProviders>>(
      (accumulator, [region, offers]: [string, any]) => {
        const regionProviders = TMDB_WATCH_PROVIDER_OFFERS.reduce((offersByType, offerType) => {
          offersByType[offerType] = this.toWatchProviders(offers?.[offerType]);

          return offersByType;
        }, {} as TMDBWatchProviderOffers);

        const hasOffers = TMDB_WATCH_PROVIDER_OFFERS.some((offerType) => regionProviders[offerType].length > 0);

        if (hasOffers) {
          accumulator[region] = { link: offers?.link ?? null, ...regionProviders };
        }

        return accumulator;
      },
      {},
    );

    await this.cacheService.set(cachedKey, providersByRegion, CACHE_KEYS.TMDB_WATCH_PROVIDERS_BY_ID.expiration);

    return providersByRegion;
  }

  async getWatchProviders(
    mediaType: TMDBWatchMediaType,
    tmdbId: number,
    region: string = TMDB_DEFAULT_WATCH_REGION,
  ): Promise<TMDBWatchProviders> {
    try {
      const providersByRegion = await this.getWatchProvidersByMedia(mediaType, tmdbId);
      const regionCode = region.toUpperCase();
      const regionProviders = providersByRegion[regionCode];

      const emptyOffers = TMDB_WATCH_PROVIDER_OFFERS.reduce((offersByType, offerType) => {
        offersByType[offerType] = [];

        return offersByType;
      }, {} as TMDBWatchProviderOffers);

      return {
        region: regionCode,
        availableRegions: Object.keys(providersByRegion).sort(),
        ...emptyOffers,
        ...regionProviders,
        link: regionProviders?.link ?? null,
      };
    } catch (error: any) {
      if (error instanceof AppException) {
        throw error;
      }

      if (error?.response?.status === 404) {
        throw new AppException(mediaType === "movie" ? ERROR_CODES.MOVIE_NOT_FOUND : ERROR_CODES.TV_SHOW_NOT_FOUND);
      }

      this.logger.error(
        `Failed to fetch watch providers for ${mediaType} ID ${tmdbId} from TMDB API: ${error.message}`,
        error.stack,
      );

      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  async getWatchProviderRegions(): Promise<TMDBWatchProviderRegion[]> {
    try {
      const cachedRegions = await this.cacheService.get<TMDBWatchProviderRegion[]>(
        CACHE_KEYS.TMDB_WATCH_PROVIDER_REGIONS.prefix,
      );

      if (cachedRegions) {
        return cachedRegions;
      }

      const regionsResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/watch/providers/regions`, {
          headers: {
            Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
          },
        }),
      );

      const regions: TMDBWatchProviderRegion[] = (regionsResponse.data?.results ?? [])
        .map((region: any) => ({
          code: region.iso_3166_1,
          name: region.english_name,
          nativeName: region.native_name,
        }))
        .sort((a: TMDBWatchProviderRegion, b: TMDBWatchProviderRegion) => a.name.localeCompare(b.name));

      await this.cacheService.set(
        CACHE_KEYS.TMDB_WATCH_PROVIDER_REGIONS.prefix,
        regions,
        CACHE_KEYS.TMDB_WATCH_PROVIDER_REGIONS.expiration,
      );

      return regions;
    } catch (error: any) {
      this.logger.error(`Failed to fetch watch provider regions from TMDB API: ${error.message}`, error.stack);

      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }
}
