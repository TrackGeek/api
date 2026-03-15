import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DEFAULT_PAGINATION_PAGE } from "@/shared/infra/database/database.service";
import { CacheService } from "../cache/cache.service";

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
  name: string;
  releaseDate: Date | null;
  posterUrl: string | null;
}

export interface TMDBTopMovieResult {
  tmdbId: number;
  name: string;
  releaseDate: Date | null;
  posterUrl: string | null;
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
  backdropUrl: string | null;
  belongsToCollection: {
    name: string;
    posterUrl: string | null;
    backdropUrl: string | null;
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
  videos: {
    id: string;
    key: string;
    name: string;
    site: string;
    type: string;
    publishedAt: Date | null;
  }[];
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
}

export interface TMDBTVShowSeason {
  id: number;
  name: string;
  seasonNumber: number;
  airDate: Date | null;
  posterUrl: string | null;
  episodes: {
    episodeNumber: number;
    name: string;
    overview: string | null;
    airDate: Date | null;
    stillUrl: string | null;
  }[];
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

  async searchMovies(query: string): Promise<TMDBSearchMovieResult[]> {
    try {
      const cachedMovies = await this.cacheService.get<TMDBSearchMovieResult[]>(
        CACHE_KEYS.TMDB_SEARCH_MOVIES.prefix(query),
      );

      if (cachedMovies) {
        return cachedMovies;
      }

      const movieResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/search/movie`, {
          params: { query },
          headers: {
            Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
          },
        }),
      );

      const moviesData = movieResponse.data;

      const movies = moviesData.results.map((movie: any) => ({
        tmdbId: movie.id,
        name: movie.title,
        releaseDate: movie.release_date ? new Date(movie.release_date) : null,
        posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      }));

      await this.cacheService.set(
        CACHE_KEYS.TMDB_SEARCH_MOVIES.prefix(query),
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

  async topMovies({ page = DEFAULT_PAGINATION_PAGE, filter }: TMDBTopMovieOptions): Promise<TMDBTopMovieResult[]> {
    const TMDB_MOVIE_FILTER_PATH: Record<TMDBMovieFilter, string> = {
      [TMDBMovieFilter.Airing]: "movie/now_playing",
      [TMDBMovieFilter.Upcoming]: "discover/movie",
      [TMDBMovieFilter.Trending]: "trending/movie/day",
      [TMDBMovieFilter.Popular]: "movie/popular",
    };

    try {
      const topMoviesOptions = { page, filter };
      const topMoviesKey = CACHE_KEYS.TMDB_TOP_MOVIES.prefix({ ...topMoviesOptions });

      const cachedTopMovies = await this.cacheService.get<TMDBTopMovieResult[]>(topMoviesKey);
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

      const movies = topMovieResponse.data.results.map((movie: any) => ({
        tmdbId: movie.id,
        name: movie.title,
        releaseDate: movie.release_date ? new Date(movie.release_date) : null,
        backdropUrl: movie.backdrop_path
          ? `https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${movie.backdrop_path}`
          : null,
        overview: movie.overview,
        posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      }));

      await this.cacheService.set(topMoviesKey, movies, CACHE_KEYS.TMDB_TOP_MOVIES.expiration);

      return movies;
    } catch (error) {
      this.logger.error("Failed to fetch top movies from TMDB API", error);
      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  async searchTVShows(query: string): Promise<TMDBSearchTVShowResult[]> {
    try {
      const cachedTVShows = await this.cacheService.get<TMDBSearchTVShowResult[]>(
        CACHE_KEYS.TMDB_SEARCH_TV_SHOWS.prefix(query),
      );

      if (cachedTVShows) {
        return cachedTVShows;
      }

      const tvShowsResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/search/tv`, {
          params: { query },
          headers: {
            Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
          },
        }),
      );

      const tvShowsData = tvShowsResponse.data;

      const tvShows = tvShowsData.results.map((show: any) => ({
        tmdbId: show.id,
        name: show.name,
        firstAirDate: show.first_air_date ? new Date(show.first_air_date) : null,
        posterUrl: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : null,
      }));

      await this.cacheService.set(
        CACHE_KEYS.TMDB_SEARCH_TV_SHOWS.prefix(query),
        tvShows,
        CACHE_KEYS.TMDB_SEARCH_TV_SHOWS.expiration,
      );

      return tvShows;
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.TV_SHOW_NOT_FOUND);
      }

      this.logger.error(`Failed to search TV shows from TMDB API for query "${query}": ${error.message}`, error.stack);

      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  async topTVShows({ page = DEFAULT_PAGINATION_PAGE, filter }: TMDBTopTVShowsOptions): Promise<TMDBTopTVShowResult[]> {
    const TMDB_TV_SHOWS_FILTER_PATH: Record<TMDBTVShowFilter, string> = {
      [TMDBTVShowFilter.Airing]: "tv/airing_today",
      [TMDBTVShowFilter.Upcoming]: "discover/tv",
      [TMDBTVShowFilter.Trending]: "trending/tv/day",
      [TMDBTVShowFilter.Popular]: "tv/popular",
    };

    try {
      const topTVShowsOptions = { page, filter };
      const topTVShowsKey = CACHE_KEYS.TMDB_TOP_TV_SHOWS.prefix({ ...topTVShowsOptions });

      const cachedTopTVShows = await this.cacheService.get<TMDBTopTVShowResult[]>(topTVShowsKey);
      if (cachedTopTVShows) return cachedTopTVShows;

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

      const tvShows = tvShowsData.results.map((show: any) => ({
        tmdbId: show.id,
        name: show.name,
        firstAirDate: show.first_air_date ? new Date(show.first_air_date) : null,
        posterUrl: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : null,
        backdropUrl: show.backdrop_path
          ? `https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${show.backdrop_path}`
          : null,
        tagline: show.overview,
      }));

      await this.cacheService.set(topTVShowsKey, tvShows, CACHE_KEYS.TMDB_TOP_TV_SHOWS.expiration);

      return tvShows;
    } catch (error) {
      this.logger.error("Failed to fetch top TV shows from TMDB API", error);
      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  async getMovieById(id: number): Promise<TMDBMovieDetails> {
    try {
      const cachedMovie = await this.cacheService.get<TMDBMovieDetails>(CACHE_KEYS.TMDB_MOVIE_BY_ID.prefix(id));

      if (cachedMovie) {
        return cachedMovie;
      }

      const movieResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/movie/${id}`, {
          headers: {
            Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
          },
        }),
      );

      const creditsResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/movie/${id}/credits`, {
          headers: {
            Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
          },
        }),
      );

      const movieData = movieResponse.data;
      const creditsData = creditsResponse.data;

      const videosResponse = movieData?.video
        ? await firstValueFrom(
            this.httpService.get(`${this.TMDB_API_URL}/movie/${id}/videos`, {
              headers: {
                Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
              },
            }),
          )
        : null;

      const videosData = videosResponse ? videosResponse.data.results : [];

      const movie = {
        tmdbId: movieData.id,
        imdbId: movieData.imdb_id,
        backdropUrl: movieData.backdrop_path ? `https://image.tmdb.org/t/p/w500${movieData.backdrop_path}` : null,
        belongsToCollection: movieData.belongs_to_collection
          ? {
              name: movieData.belongs_to_collection.name,
              posterUrl: movieData.belongs_to_collection.poster_path
                ? `https://image.tmdb.org/t/p/w500${movieData.belongs_to_collection.poster_path}`
                : null,
              backdropUrl: movieData.belongs_to_collection.backdrop_path
                ? `https://image.tmdb.org/t/p/w500${movieData.belongs_to_collection.backdrop_path}`
                : null,
            }
          : {},
        budget: movieData.budget,
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
        cast: creditsData.cast.map((castMember: any) => ({
          id: castMember.id,
          name: castMember.name,
          character: castMember.character,
          profileUrl: castMember.profile_path ? `https://image.tmdb.org/t/p/w500${castMember.profile_path}` : null,
        })),
        crew: creditsData.crew.map((crewMember: any) => ({
          id: crewMember.id,
          name: crewMember.name,
          job: crewMember.job,
          profileUrl: crewMember.profile_path ? `https://image.tmdb.org/t/p/w500${crewMember.profile_path}` : null,
        })),
        videos: videosData?.map((video: any) => ({
          id: video.id,
          key: video.key,
          name: video.name,
          site: video.site,
          type: video.type,
          publishedAt: video.published_at ? new Date(video.published_at) : null,
        })),
      } as TMDBMovieDetails;

      await this.cacheService.set(
        CACHE_KEYS.TMDB_MOVIE_BY_ID.prefix(id),
        movie,
        CACHE_KEYS.TMDB_MOVIE_BY_ID.expiration,
      );

      return movie;
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.MOVIE_NOT_FOUND);
      }

      this.logger.error(`Failed to fetch movie details for ID ${id} from TMDB API: ${error.message}`, error.stack);

      throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    }
  }

  async getTVShowById(id: number): Promise<TMDBTVShowDetails> {
    try {
      const cachedTVShow = await this.cacheService.get<TMDBTVShowDetails>(CACHE_KEYS.TMDB_TV_SHOW_BY_ID.prefix(id));

      if (cachedTVShow) {
        return cachedTVShow;
      }

      const tvShowResponse = await firstValueFrom(
        this.httpService.get(
          `${this.TMDB_API_URL}/tv/${id}?append_to_response=credits%2Cimages%2Cvideos%2Cexternal_ids`,
          {
            headers: {
              Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
            },
          },
        ),
      );

      const tvShowData = tvShowResponse.data;

      const tvShow = {
        tmdbId: tvShowData.id,
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
        cast: tvShowData.credits.cast.map((castMember: any) => ({
          id: castMember.id,
          name: castMember.name,
          character: castMember.character,
          profileUrl: castMember.profile_path ? `https://image.tmdb.org/t/p/w500${castMember.profile_path}` : null,
        })),
        crew: tvShowData.credits.crew.map((crewMember: any) => ({
          id: crewMember.id,
          name: crewMember.name,
          job: crewMember.job,
          profileUrl: crewMember.profile_path ? `https://image.tmdb.org/t/p/w500${crewMember.profile_path}` : null,
        })),
        backdrops: tvShowData.images.backdrops.map(
          (backdrop: any) => `https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${backdrop.file_path}`,
        ),
        trailerId:
          tvShowData.videos.results.find((video: any) => video.site === "YouTube" && video.type === "Trailer")?.key ??
          null,
        external: tvShowData.external_ids,
      } as TMDBTVShowDetails;

      await this.cacheService.set(
        CACHE_KEYS.TMDB_TV_SHOW_BY_ID.prefix(id),
        tvShow,
        CACHE_KEYS.TMDB_TV_SHOW_BY_ID.expiration,
      );

      return tvShow;
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.TV_SHOW_NOT_FOUND);
      }

      this.logger.error(`Failed to fetch TV show details for ID ${id} from TMDB API: ${error.message}`, error.stack);

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

      const seasons: any[] = [];

      for (const season of tvShowData.seasons) {
        const seasonResponse = await firstValueFrom(
          this.httpService.get(`${this.TMDB_API_URL}/tv/${id}/season/${season.season_number}`, {
            headers: {
              Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
            },
          }),
        );

        const seasonData = seasonResponse.data;

        seasons.push({
          id: seasonData.id,
          name: seasonData.name,
          seasonNumber: seasonData.season_number,
          airDate: seasonData.air_date ? new Date(seasonData.air_date) : null,
          posterUrl: seasonData.poster_path ? `https://image.tmdb.org/t/p/w500${seasonData.poster_path}` : null,
          episodes: seasonData.episodes.map((episode: any) => ({
            episodeNumber: episode.episode_number,
            name: episode.name,
            overview: episode.overview,
            airDate: episode.air_date ? new Date(episode.air_date) : null,
            stillUrl: episode.still_path ? `https://image.tmdb.org/t/p/w500${episode.still_path}` : null,
          })),
        });
      }

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
}
