import { Injectable } from "@nestjs/common";
import { ProgressStatus } from "@prisma/generated/client";
import { MovieCreateInput, MovieUpdateInput } from "@prisma/generated/models";
import { TopMovieDto } from "@/modules/movie/dto/top-movie.dto";
import { PersonSyncService, type TmdbPersonSeed } from "@/modules/person/service/person-sync.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import {
  DatabaseService,
  DEFAULT_PAGINATION_ITEMS_PER_PAGE,
  DEFAULT_PAGINATION_PAGE,
} from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import { TMDBMovieOrderBy, TMDBSort } from "@/shared/infra/integrations/tmdb.service";
import { parseIdFromSlug } from "@/shared/utils/string";
import {
  compareBy,
  getTgScoredContent,
  matchesAllNames,
  matchesQuery,
  paginateLocal,
  toNameList,
} from "@/shared/utils/tg-review-search";
import { RefreshMovieDto } from "../dto/refresh-movie.dto";
import type { SearchMovieDto } from "../dto/search-movie.dto";

export interface ReviewedMovieSortable {
  title: string;
  releaseDate: Date | null;
  tgReviewScore: number;
}

const MOVIE_ORDER_BY_VALUE: Record<TMDBMovieOrderBy, (movie: ReviewedMovieSortable) => number | string | null> = {
  [TMDBMovieOrderBy.Title]: (movie) => movie.title.toLowerCase(),
  [TMDBMovieOrderBy.ReleaseDate]: (movie) => movie.releaseDate?.getTime() ?? 0,
  [TMDBMovieOrderBy.Score]: (movie) => movie.tgReviewScore,
};

@Injectable()
export class MovieService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
    private readonly personSyncService: PersonSyncService,
  ) {}

  async searchMovies(searchMovieDto: SearchMovieDto) {
    if (searchMovieDto.minTgScore != null) {
      return this.searchReviewedMovies(searchMovieDto);
    }

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

  /**
   * The TrackGeek rating filter can only match movies we already store, so it searches our own
   * records instead of TMDB — which keeps pagination and totals accurate.
   */
  private async searchReviewedMovies({
    page = DEFAULT_PAGINATION_PAGE,
    query,
    genres,
    year,
    orderBy = TMDBMovieOrderBy.Score,
    sort = TMDBSort.Desc,
    minTgScore = 0,
  }: SearchMovieDto) {
    const scored = await getTgScoredContent(this.databaseService.movieReview, "movieId", minTgScore);
    const scoreById = new Map(scored.map((entry) => [entry.id, entry.tgReviewScore]));

    const movies = await this.databaseService.movie.findMany({
      where: { id: { in: [...scoreById.keys()] } },
      select: {
        id: true,
        tmdbId: true,
        title: true,
        overview: true,
        genres: true,
        isAdult: true,
        tmdbReviewScore: true,
        releaseDate: true,
        posterUrl: true,
        lastRefreshedAt: true,
      },
    });

    const items = movies
      .map((movie) => ({
        tmdbId: movie.tmdbId,
        title: movie.title ?? "",
        overview: movie.overview,
        isAdult: movie.isAdult ?? false,
        genres: toNameList(movie.genres),
        tmdbReviewScore: movie.tmdbReviewScore ?? 0,
        releaseDate: movie.releaseDate,
        posterUrl: movie.posterUrl,
        tgReviewScore: scoreById.get(movie.id) ?? 0,
        lastRefreshedAt: movie.lastRefreshedAt,
      }))
      .filter((movie) => matchesQuery(movie.title, query))
      .filter((movie) => matchesAllNames(movie.genres, genres))
      .filter((movie) => !year || String(movie.releaseDate?.getFullYear() ?? "") === year);

    const sorted = compareBy(items, MOVIE_ORDER_BY_VALUE[orderBy], sort);

    return paginateLocal(sorted, page, DEFAULT_PAGINATION_ITEMS_PER_PAGE);
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

  async getMovieFranchise(slug: string) {
    const collectionId = parseIdFromSlug(slug);

    if (collectionId === null) {
      throw new AppException(ERROR_CODES.MOVIE_FRANCHISE_NOT_FOUND);
    }

    const collection = await this.integrationsService.tmdb.getMovieCollectionById(collectionId);

    const trackedMovies = await this.databaseService.movie.findMany({
      where: { tmdbId: { in: collection.parts.map((part) => part.tmdbId) } },
      select: { tmdbId: true, lastRefreshedAt: true, movieReviews: { select: { overall: true } } },
    });

    const parts = collection.parts.map((part) => {
      const tracked = trackedMovies.find((movie) => movie.tmdbId === part.tmdbId);
      const reviews = tracked?.movieReviews ?? [];
      const tgReviewScore = reviews.length
        ? parseFloat((reviews.reduce((sum, review) => sum + Number(review.overall), 0) / reviews.length).toFixed(1))
        : 0;

      return {
        ...part,
        tgReviewScore,
        lastRefreshedAt: tracked?.lastRefreshedAt ?? null,
      };
    });

    return { ...collection, parts };
  }

  async getMovieByTmdbId(tmdbId: number) {
    let movie = await this.databaseService.movie.findUnique({
      where: { tmdbId },
    });

    if (!movie) {
      const tmdbMovie = await this.integrationsService.tmdb.getMovieById(tmdbId);

      movie = await this.databaseService.movie.create({
        data: {
          ...tmdbMovie,
          budget: String(tmdbMovie.budget),
          revenue: String(tmdbMovie.revenue),
        } as unknown as MovieCreateInput,
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

    const { cast, crew } = await this.personSyncService.linkTmdbCredits({
      cast: movie.cast as unknown as TmdbPersonSeed[],
      crew: movie.crew as unknown as TmdbPersonSeed[],
    });

    const movieWithStats = {
      ...movie,
      budget: Number(movie.budget),
      revenue: Number(movie.revenue),
      cast,
      crew,
      tgReviewScore,
      progressStats,
    };

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

    const tmdbMovie = await this.integrationsService.tmdb.getMovieById(movie.tmdbId);

    await this.databaseService.movie.update({
      where: { tmdbId: refreshMovieDto.id },
      data: {
        ...tmdbMovie,
        budget: String(tmdbMovie.budget),
        revenue: String(tmdbMovie.revenue),
      } as unknown as MovieUpdateInput,
    });

    await this.getMovieByTmdbId(refreshMovieDto.id);
  }
}
