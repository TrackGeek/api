import { Injectable } from "@nestjs/common";
import { Movie } from "@prisma/generated/client";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import { RefreshMovieDto } from "./dtos/refresh-movie.dto";
import type { SearchMovieDto } from "./dtos/search-movie.dto";
import { CACHE_KEYS } from '@/shared/constants/cache';

@Injectable()
export class MovieService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async searchMovies(searchMovieDto: SearchMovieDto) {
    return this.integrationsService.tmdb.searchMovies(searchMovieDto.query);
  }

  async getMovieById(id: number) {
    const cachedMovie = await this.cacheService.get<Movie>(CACHE_KEYS.MOVIE_BY_IMDB_ID.prefix(id));

    if (cachedMovie) {
      return cachedMovie;
    }

    let movie = await this.databaseService.movie.findUnique({
      where: { tmdbId: id },
    });

    if (!movie) {
      const tmdbMovie = await this.integrationsService.tmdb.getMovieById(id);

      movie = await this.databaseService.movie.create({
        data: tmdbMovie,
      });
    }

    await this.cacheService.set(CACHE_KEYS.MOVIE_BY_IMDB_ID.prefix(id), movie, CACHE_KEYS.MOVIE_BY_IMDB_ID.expiration);

    return movie;
  }

  async refreshMovie(refreshMovieDto: RefreshMovieDto) {
    const movie = await this.databaseService.movie.findUnique({
      where: { tmdbId: refreshMovieDto.id },
    });

    if (!movie) {
      throw new AppException(ERROR_CODES.MOVIE_NOT_FOUND);
    }

    if (Date.now() - movie.lastRefreshedAt.getTime() < REFRESH_INTERVAL_MS) {
      throw new AppException(ERROR_CODES.MOVIE_ALREADY_REFRESHED);
    }

    if (await this.cacheService.exists(CACHE_KEYS.MOVIE_BY_IMDB_ID.prefix(movie.tmdbId))) {
      await this.cacheService.delete(CACHE_KEYS.MOVIE_BY_IMDB_ID.prefix(movie.tmdbId));
    }

    const tmdbMovie = await this.integrationsService.tmdb.getMovieById(movie.tmdbId);

    await this.databaseService.movie.update({
      where: { tmdbId: refreshMovieDto.id },
      data: tmdbMovie,
    });

    await this.cacheService.set(
      CACHE_KEYS.MOVIE_BY_IMDB_ID.prefix(movie.tmdbId),
      movie,
      CACHE_KEYS.MOVIE_BY_IMDB_ID.expiration,
    );
  }
}
