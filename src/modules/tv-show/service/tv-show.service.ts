import { Injectable } from "@nestjs/common";
import { ProgressStatus } from "@prisma/generated/client";
import { TvShowCreateInput, TvShowUpdateInput } from "@prisma/generated/models";
import { PersonSyncService, type TmdbPersonSeed } from "@/modules/person/service/person-sync.service";
import { TopTvShowDto } from "@/modules/tv-show/dto/top-tv-show.dto";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { CacheService } from "@/shared/infra/cache/cache.service";
import {
  DatabaseService,
  DEFAULT_PAGINATION_ITEMS_PER_PAGE,
  DEFAULT_PAGINATION_PAGE,
} from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import {
  TMDBSort,
  TMDBTVShowOrderBy,
  TMDBTVShowSeason,
  TMDBTVShowSeasonEpisode,
} from "@/shared/infra/integrations/tmdb.service";
import {
  compareBy,
  getTgScoredContent,
  matchesAllNames,
  matchesQuery,
  paginateLocal,
  toNameList,
} from "@/shared/utils/tg-review-search";
import { GetTVShowWatchProvidersDto } from "../dto/get-tv-show-watch-providers.dto";
import { RefreshTVShowDto } from "../dto/refresh-tv-show.dto";
import { ResetTVShowTrackingDto } from "../dto/reset-tv-show-tracking.dto";
import type { SearchTVShowDto } from "../dto/search-tv-show.dto";

export interface ReviewedTVShowSortable {
  name: string;
  firstAirDate: Date | null;
  tgReviewScore: number;
}

const TV_SHOW_ORDER_BY_VALUE: Record<TMDBTVShowOrderBy, (tvShow: ReviewedTVShowSortable) => number | string | null> = {
  [TMDBTVShowOrderBy.Name]: (tvShow) => tvShow.name.toLowerCase(),
  [TMDBTVShowOrderBy.FirstAirDate]: (tvShow) => tvShow.firstAirDate?.getTime() ?? 0,
  [TMDBTVShowOrderBy.Score]: (tvShow) => tvShow.tgReviewScore,
};

@Injectable()
export class TVShowService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
    private readonly personSyncService: PersonSyncService,
  ) {}

  async searchTVShows(searchTVShowDto: SearchTVShowDto) {
    if (searchTVShowDto.minTgScore != null) {
      return this.searchReviewedTVShows(searchTVShowDto);
    }

    const tmdbPagination = await this.integrationsService.tmdb.searchTVShows(searchTVShowDto);

    const items = await Promise.all(
      tmdbPagination.items.map(async (item) => {
        const tgReviewScore = await this.databaseService.tvShowReview
          .aggregate({ where: { tvShow: { tmdbId: item.tmdbId } }, _avg: { overall: true } })
          .then((result) => (result._avg.overall ? parseFloat(result._avg.overall.toFixed(1)) : 0))
          .catch(() => 0);

        const tvShow = await this.databaseService.tvShow.findUnique({
          where: { tmdbId: item.tmdbId },
          select: { lastRefreshedAt: true },
        });

        return {
          ...item,
          tgReviewScore,
          lastRefreshedAt: tvShow?.lastRefreshedAt ?? null,
        };
      }),
    );

    return {
      ...tmdbPagination,
      items,
    };
  }

  /**
   * The TrackGeek rating filter can only match TV shows we already store, so it searches our own
   * records instead of TMDB — which keeps pagination and totals accurate.
   */
  private async searchReviewedTVShows({
    page = DEFAULT_PAGINATION_PAGE,
    query,
    genres,
    year,
    orderBy = TMDBTVShowOrderBy.Score,
    sort = TMDBSort.Desc,
    minTgScore = 0,
  }: SearchTVShowDto) {
    const scored = await getTgScoredContent(this.databaseService.tvShowReview, "tvShowId", minTgScore);
    const scoreById = new Map(scored.map((entry) => [entry.id, entry.tgReviewScore]));

    const tvShows = await this.databaseService.tvShow.findMany({
      where: { id: { in: [...scoreById.keys()] } },
      select: {
        id: true,
        tmdbId: true,
        name: true,
        genres: true,
        isAdult: true,
        tmdbReviewScore: true,
        firstAirDate: true,
        posterUrl: true,
        lastRefreshedAt: true,
      },
    });

    const items = tvShows
      .map((tvShow) => ({
        tmdbId: tvShow.tmdbId,
        name: tvShow.name ?? "",
        isAdult: tvShow.isAdult ?? false,
        genres: toNameList(tvShow.genres),
        tmdbReviewScore: tvShow.tmdbReviewScore ?? 0,
        firstAirDate: tvShow.firstAirDate,
        posterUrl: tvShow.posterUrl,
        tgReviewScore: scoreById.get(tvShow.id) ?? 0,
        lastRefreshedAt: tvShow.lastRefreshedAt,
      }))
      .filter((tvShow) => matchesQuery(tvShow.name, query))
      .filter((tvShow) => matchesAllNames(tvShow.genres, genres))
      .filter((tvShow) => !year || String(tvShow.firstAirDate?.getFullYear() ?? "") === year);

    const sorted = compareBy(items, TV_SHOW_ORDER_BY_VALUE[orderBy], sort);

    return paginateLocal(sorted, page, DEFAULT_PAGINATION_ITEMS_PER_PAGE);
  }

  async topTVShows(topTvShowDto: TopTvShowDto) {
    const tmdbPagination = await this.integrationsService.tmdb.topTVShows(topTvShowDto);

    const items = await Promise.all(
      tmdbPagination.items.map(async (item) => {
        const tgReviewScore = await this.databaseService.tvShowReview
          .aggregate({ where: { tvShow: { tmdbId: item.tmdbId } }, _avg: { overall: true } })
          .then((result) => (result._avg.overall ? parseFloat(result._avg.overall.toFixed(1)) : 0))
          .catch(() => 0);

        const tvShow = await this.databaseService.tvShow.findUnique({
          where: { tmdbId: item.tmdbId },
          select: { lastRefreshedAt: true },
        });

        return {
          ...item,
          tgReviewScore,
          lastRefreshedAt: tvShow?.lastRefreshedAt ?? null,
        };
      }),
    );

    return {
      ...tmdbPagination,
      items,
    };
  }

  async tvShowFilters() {
    const orderBy = Object.values(TMDBTVShowOrderBy);
    const sort = Object.values(TMDBSort);
    const genres = await this.integrationsService.tmdb.getTVShowGenres();

    return {
      genres,
      orderBy,
      sort,
    };
  }

  async getTVShowByTmdbId(tmdbId: number) {
    let tvShow = await this.databaseService.tvShow.findUnique({
      where: { tmdbId },
      omit: {
        seasons: true,
      },
    });

    if (!tvShow) {
      const tmdbTVShow = await this.integrationsService.tmdb.getTVShowById(tmdbId);

      tvShow = await this.databaseService.tvShow.create({
        data: tmdbTVShow as unknown as TvShowCreateInput,
      });
    }

    const tgReviewScore = await this.databaseService.tvShowReview
      .aggregate({ where: { tvShow: { tmdbId } }, _avg: { overall: true } })
      .then((result) => (result._avg.overall ? parseFloat(result._avg.overall.toFixed(1)) : 0))
      .catch(() => 0);

    const progressGroups = await this.databaseService.tvShowProgress.groupBy({
      by: ["status"],
      where: { tvShow: { tmdbId } },
      _count: { status: true },
    });

    const totalProgress = progressGroups.reduce((sum, g) => sum + g._count.status, 0);

    const getStats = (...statuses: ProgressStatus[]) => {
      const count = progressGroups
        .filter((g) => statuses.includes(g.status))
        .reduce((sum, g) => sum + g._count.status, 0);
      return {
        count,
        percentage: totalProgress > 0 ? parseFloat(((count / totalProgress) * 100).toFixed(1)) : 0,
      };
    };

    const progressStats = {
      watching: getStats(ProgressStatus.Watching, ProgressStatus.Rewatching),
      completed: getStats(ProgressStatus.Completed),
      planToWatch: getStats(ProgressStatus.Planning),
      dropped: getStats(ProgressStatus.Dropped),
    };

    const { cast, crew, createdBy } = await this.personSyncService.linkTmdbCredits({
      cast: tvShow.cast as unknown as TmdbPersonSeed[],
      crew: tvShow.crew as unknown as TmdbPersonSeed[],
      createdBy: tvShow.createdBy as unknown as TmdbPersonSeed[],
    });

    const tvShowWithStats = {
      ...tvShow,
      cast,
      crew,
      createdBy,
      tgReviewScore,
      progressStats,
    };

    return tvShowWithStats;
  }

  async getTVShowSeasons(tmdbId: number) {
    const tvShow = await this.databaseService.tvShow.findUnique({
      where: { tmdbId },
      select: { seasons: true },
    });

    if (!tvShow) {
      throw new AppException(ERROR_CODES.TV_SHOW_NOT_FOUND);
    }

    const seasons = await this.integrationsService.tmdb.getTVShowSeasonsById(tmdbId);

    await this.databaseService.tvShow.update({
      where: { tmdbId },
      data: { seasons } as unknown as TvShowUpdateInput,
    });

    return seasons;
  }

  async getTVShowSeasonEpisodes(tmdbId: number, seasonNumber: number) {
    const tvShow = await this.databaseService.tvShow.findUnique({
      where: { tmdbId },
      select: { episodes: true },
    });

    if (!tvShow) {
      throw new AppException(ERROR_CODES.TV_SHOW_NOT_FOUND);
    }

    const allEpisodes = (tvShow.episodes ?? []) as unknown as (TMDBTVShowSeasonEpisode & { seasonNumber: number })[];
    const seasonEpisodes = allEpisodes.filter((ep) => ep.seasonNumber === seasonNumber);

    if (seasonEpisodes.length > 0) {
      return seasonEpisodes;
    }

    const episodes = await this.integrationsService.tmdb.getTVShowSeasonEpisdoesById(tmdbId, seasonNumber);

    await this.databaseService.tvShow.update({
      where: { tmdbId },
      data: {
        episodes: [...allEpisodes, ...episodes.map((ep) => ({ ...ep, seasonNumber }))],
      } as unknown as TvShowUpdateInput,
    });

    await this.cacheService.set(
      CACHE_KEYS.TMDB_TV_SHOW_SEASON_EPISODES_BY_ID.prefix(tmdbId, seasonNumber),
      episodes,
      CACHE_KEYS.TMDB_TV_SHOW_SEASON_EPISODES_BY_ID.expiration,
    );

    return episodes;
  }

  async getTVShowWatchProviders(tmdbId: number, { region }: GetTVShowWatchProvidersDto) {
    return this.integrationsService.tmdb.getWatchProviders("tv", tmdbId, region);
  }

  async getWatchProviderRegions() {
    return this.integrationsService.tmdb.getWatchProviderRegions();
  }

  async refreshTVShow(refreshTVShowDto: RefreshTVShowDto) {
    const tvShow = await this.databaseService.tvShow.findUnique({
      where: { tmdbId: refreshTVShowDto.tmdbId },
      select: {
        lastRefreshedAt: true,
        seasons: true,
      },
    });

    if (!tvShow) {
      throw new AppException(ERROR_CODES.TV_SHOW_NOT_FOUND);
    }

    if (Date.now() - tvShow.lastRefreshedAt.getTime() < REFRESH_INTERVAL_MS) {
      throw new AppException(ERROR_CODES.TV_SHOW_ALREADY_REFRESHED);
    }

    const existingSeasons = (tvShow.seasons ?? []) as unknown as TMDBTVShowSeason[];

    for (const season of existingSeasons) {
      const episodesCacheKey = CACHE_KEYS.TMDB_TV_SHOW_SEASON_EPISODES_BY_ID.prefix(
        refreshTVShowDto.tmdbId,
        season.seasonNumber,
      );

      if (await this.cacheService.exists(episodesCacheKey)) {
        await this.cacheService.delete(episodesCacheKey);
      }
    }

    const [tmdbTVShow, tmdbSeasons] = await Promise.all([
      this.integrationsService.tmdb.getTVShowById(refreshTVShowDto.tmdbId),
      this.integrationsService.tmdb.getTVShowSeasonsById(refreshTVShowDto.tmdbId),
    ]);

    const tmdbEpisodes: Awaited<ReturnType<typeof this.integrationsService.tmdb.getTVShowSeasonEpisdoesById>> = [];

    for (const season of tmdbSeasons) {
      const episodes = await this.integrationsService.tmdb.getTVShowSeasonEpisdoesById(
        refreshTVShowDto.tmdbId,
        season.seasonNumber,
      );

      await this.cacheService.set(
        CACHE_KEYS.TMDB_TV_SHOW_SEASON_EPISODES_BY_ID.prefix(refreshTVShowDto.tmdbId, season.seasonNumber),
        episodes,
        CACHE_KEYS.TMDB_TV_SHOW_SEASON_EPISODES_BY_ID.expiration,
      );

      tmdbEpisodes.push(...episodes);

      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    await this.databaseService.tvShow.update({
      where: { tmdbId: refreshTVShowDto.tmdbId },
      data: { ...tmdbTVShow, seasons: tmdbSeasons, episodes: tmdbEpisodes } as unknown as TvShowUpdateInput,
    });

    await this.getTVShowByTmdbId(refreshTVShowDto.tmdbId);
  }

  async resetTVShowTracking({ userId, tvShowId }: ResetTVShowTrackingDto) {
    await this.databaseService.$transaction([
      this.databaseService.tvShowReview.deleteMany({ where: { userId, tvShowId } }),
      this.databaseService.tvShowProgress.deleteMany({ where: { userId, tvShowId } }),
      this.databaseService.tvShowEpisodeWatch.deleteMany({ where: { userId, tvShowId } }),
    ]);
  }
}
