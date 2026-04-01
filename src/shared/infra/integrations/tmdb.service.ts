import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DEFAULT_PAGINATION_PAGE } from "@/shared/infra/database/database.service";
import { CacheService } from "../cache/cache.service";

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
  query: string;
  page?: number;
  orderBy?: TMDBTVShowOrderBy;
  sort?: TMDBSort;
  genres?: number[];
}

export interface TMDBSearchMovieOptions {
  query: string;
  page?: number;
  orderBy?: TMDBMovieOrderBy;
  sort?: TMDBSort;
  genres?: number[];
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
  budget: number;
  genres: string[];
  homepage: string | null;
  originalLanguage: string;
  originalTitle: string;
  overview: string | null;
  popularity: number;
  posterUrl: string | null;
  productionCompanies: {
    logoUrl: string | null;
    name: string;
    originCountry: string;
  }[];
  productionCountries: string[];
  releaseDate: Date | null;
  revenue: number;
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

@Injectable()
export class TMDBService {
  private readonly logger = new Logger(TMDBService.name);

  private readonly TMDB_API_URL = "https://api.themoviedb.org/3";

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

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
    } catch (error) {
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
    } catch (error) {
      this.logger.error(`Failed to fetch movie genres from TMDB API: ${error.message}`, error.stack);

      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  async searchTVShows({
    query,
    page = DEFAULT_PAGINATION_PAGE,
    orderBy,
    sort = TMDBSort.Desc,
    genres,
  }: TMDBSearchTVShowOptions): Promise<IGDBPagination<TMDBSearchTVShowResult>> {
    try {
      const cachedTVShowsKey = CACHE_KEYS.TMDB_SEARCH_TV_SHOWS.prefix({ query, page, orderBy, sort, genres });
      const cachedTVShows = await this.cacheService.get<IGDBPagination<TMDBSearchTVShowResult>>(cachedTVShowsKey);

      if (cachedTVShows) {
        return cachedTVShows;
      }

      const tvShowsResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/search/tv`, {
          params: { query, page },
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

      if (genres?.length) {
        items = items.filter((item: any) => genres.every((id) => item.genres.some((g: any) => g.id === id)));
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
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.TV_SHOW_NOT_FOUND);
      }

      this.logger.error(`Failed to search TV shows from TMDB API for query "${query}": ${error.message}`, error.stack);

      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  async searchMovies({
    query,
    page = DEFAULT_PAGINATION_PAGE,
    orderBy,
    sort = TMDBSort.Desc,
    genres,
  }: TMDBSearchMovieOptions): Promise<IGDBPagination<TMDBSearchMovieResult>> {
    try {
      const cachedMoviesKey = CACHE_KEYS.TMDB_SEARCH_MOVIES.prefix({ query, page, orderBy, sort, genres });

      const cachedMovies = await this.cacheService.get<IGDBPagination<TMDBSearchMovieResult>>(cachedMoviesKey);

      if (cachedMovies) {
        return cachedMovies;
      }

      const movieResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/search/movie`, {
          params: { query, page },
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

      if (genres?.length) {
        items = items.filter((item: any) => genres.every((id) => item.genres.some((g: any) => g.id === id)));
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
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.MOVIE_NOT_FOUND);
      }

      this.logger.error(`Failed to search movies from TMDB API for query "${query}": ${error.message}`, error.stack);

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
    } catch (error) {
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
    } catch (error) {
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
        budget: movieData.budget,
        isAdult: movieData.adult,
        genres: movieData.genres.map((genre: any) => genre.name),
        homepage: movieData.homepage,
        originalLanguage: movieData.original_language,
        originalTitle: movieData.original_title,
        overview: movieData.overview,
        popularity: movieData.popularity,
        posterUrl: movieData.poster_path ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}` : null,
        productionCompanies: movieData.production_companies.map((company: any) => ({
          logoUrl: company.logo_path ? `https://image.tmdb.org/t/p/w500${company.logo_path}` : null,
          name: company.name,
          originCountry: company.origin_country,
        })),
        productionCountries: movieData.production_countries.map((country: any) => country.name),
        releaseDate: movieData.release_date ? new Date(movieData.release_date) : null,
        revenue: movieData.revenue,
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
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.MOVIE_NOT_FOUND);
      }

      this.logger.error(`Failed to fetch movie details for ID ${tmdbId} from TMDB API: ${error.message}`, error.stack);

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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
}
