import { Injectable } from "@nestjs/common";
import { Movie, ProgressStatus } from "@prisma/generated/client";
import { MovieCreateInput, MovieUpdateInput } from "@prisma/generated/models";
import { TopMovieDto } from "@/modules/movie/dto/top-movie.dto";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import { RefreshMovieDto } from "../dto/refresh-movie.dto";
import type { SearchMovieDto } from "../dto/search-movie.dto";
import { TMDBMovieOrderBy, TMDBSort } from "@/shared/infra/integrations/tmdb.service";

@Injectable()
export class MovieService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async searchMovies(searchMovieDto: SearchMovieDto) {
    const tmdbPagination = await this.integrationsService.tmdb.searchMovies(searchMovieDto);

    const items = await Promise.all(
      tmdbPagination.items.map(async (item) => {
        const tgReviewScore = await this.databaseService.movieReview
          .aggregate({ where: { movie: { tmdbId: item.tmdbId } }, _avg: { overall: true } })
          .then((result) => (result._avg.overall ? parseFloat(result._avg.overall.toFixed(1)) : 0))
          .catch(() => 0);

        const movie = await this.databaseService.movie.findUnique({
          where: { tmdbId: item.tmdbId },
          select: { lastRefreshedAt: true },
        });

        return {
          ...item,
          tgReviewScore,
          lastRefreshedAt: movie?.lastRefreshedAt ?? null,
        };
      }),
    );

    return {
      ...tmdbPagination,
      items,
    };
  }

  async topMovies(topMovieDto: TopMovieDto) {
    const tmdbPagination = await this.integrationsService.tmdb.topMovies(topMovieDto);

    const items = await Promise.all(
      tmdbPagination.items.map(async (item) => {
        const tgReviewScore = await this.databaseService.movieReview
          .aggregate({ where: { movie: { tmdbId: item.tmdbId } }, _avg: { overall: true } })
          .then((result) => (result._avg.overall ? parseFloat(result._avg.overall.toFixed(1)) : 0))
          .catch(() => 0);

        const movie = await this.databaseService.movie.findUnique({
          where: { tmdbId: item.tmdbId },
          select: { lastRefreshedAt: true },
        });

        return {
          ...item,
          tgReviewScore,
          lastRefreshedAt: movie?.lastRefreshedAt ?? null,
        };
      }),
    );

    return {
      ...tmdbPagination,
      items,
    };
  }

  async movieFilters() {
    const orderBy = Object.values(TMDBMovieOrderBy);
    const sort = Object.values(TMDBSort);
    const genres = await this.integrationsService.tmdb.getMovieGenres();

    return {
      genres,
      orderBy,
      sort,
    };
  }

  async getMovieByTmdbId(tmdbId: number) {
    const cachedMovie = await this.cacheService.get<Movie>(CACHE_KEYS.MOVIE_BY_IMDB_ID.prefix(tmdbId));

    if (cachedMovie) {
      return cachedMovie;
    }

    let movie = await this.databaseService.movie.findUnique({
      where: { tmdbId },
    });

    if (!movie) {
      const tmdbMovie = await this.integrationsService.tmdb.getMovieById(tmdbId);

      movie = await this.databaseService.movie.create({
        data: tmdbMovie as unknown as MovieCreateInput,
      });
    }

    const tgReviewScore = await this.databaseService.movieReview
      .aggregate({ where: { movie: { tmdbId } }, _avg: { overall: true } })
      .then((result) => (result._avg.overall ? parseFloat(result._avg.overall.toFixed(1)) : 0))
      .catch(() => 0);

    const progressGroups = await this.databaseService.movieProgress.groupBy({
      by: ["status"],
      where: { movie: { tmdbId } },
      _count: { status: true },
    });

    const totalProgress = progressGroups.reduce((sum, g) => sum + g._count.status, 0);

    const getStats = (status: ProgressStatus) => {
      const count = progressGroups.find((g) => g.status === status)?._count.status ?? 0;
      return {
        count,
        percentage: totalProgress > 0 ? parseFloat(((count / totalProgress) * 100).toFixed(1)) : 0,
      };
    };

    const progressStats = {
      watching: getStats(ProgressStatus.Watching),
      completed: getStats(ProgressStatus.Completed),
      planToWatch: getStats(ProgressStatus.Planning),
      dropped: getStats(ProgressStatus.Dropped),
    };

    const movieWithStats = {
      ...movie,
      tgReviewScore,
      progressStats,
    };

    await this.cacheService.set(
      CACHE_KEYS.MOVIE_BY_IMDB_ID.prefix(tmdbId),
      movieWithStats,
      CACHE_KEYS.MOVIE_BY_IMDB_ID.expiration,
    );

    return movieWithStats;
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
      data: tmdbMovie as unknown as MovieUpdateInput,
    });

    await this.cacheService.set(
      CACHE_KEYS.MOVIE_BY_IMDB_ID.prefix(movie.tmdbId),
      movie,
      CACHE_KEYS.MOVIE_BY_IMDB_ID.expiration,
    );
  }
}
