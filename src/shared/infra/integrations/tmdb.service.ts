import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { CacheService } from "../cache/cache.service";
import { CACHE_KEYS } from '@/shared/constants/cache';

@Injectable()
export class TMDBService {
  private readonly logger = new Logger(TMDBService.name);
  
  private readonly TMDB_API_URL = "https://api.themoviedb.org/3";

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  async searchMovies(query: string): Promise<any> {
    try {
      const cachedMovies = await this.cacheService.get(CACHE_KEYS.TMDB_SEARCH_MOVIES.prefix(query));

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

  async searchTVShows(query: string): Promise<any> {
    try {
      const cachedTVShows = await this.cacheService.get(CACHE_KEYS.TMDB_SEARCH_TV_SHOWS.prefix(query));

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

  async getMovieById(id: number): Promise<any> {
    try {
      const cachedMovie = await this.cacheService.get(CACHE_KEYS.TMDB_MOVIE_BY_ID.prefix(id));

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
      };

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

  async getTVShowById(id: number): Promise<any> {
    try {
      const cachedTVShow = await this.cacheService.get(CACHE_KEYS.TMDB_TV_SHOW_BY_ID.prefix(id));

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

      const creditsResponse = await firstValueFrom(
        this.httpService.get(`${this.TMDB_API_URL}/tv/${id}/credits`, {
          headers: {
            Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
          },
        }),
      );

      const tvShowData = tvShowResponse.data;
      const creditsData = creditsResponse.data;

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

      const tvShow = {
        tmdbId: tvShowData.id,
        backdropPath: tvShowData.backdrop_path ? `https://image.tmdb.org/t/p/w500${tvShowData.backdrop_path}` : null,
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
        seasons,
      };

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
}
