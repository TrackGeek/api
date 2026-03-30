import { Injectable } from "@nestjs/common";
import { TvShow } from "@prisma/generated/client";
import { TvShowCreateInput, TvShowUpdateInput } from "@prisma/generated/models";
import { TopTvShowDto } from "@/modules/tv-show/dto/top-tv-show.dto";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import { TMDBTVShowSeason, TMDBTVShowSeasonEpisode } from "@/shared/infra/integrations/tmdb.service";
import { RefreshTVShowDto } from "../dto/refresh-tv-show.dto";
import type { SearchTVShowDto } from "../dto/search-tv-show.dto";

@Injectable()
export class TVShowService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async searchTVShows(searchTVShowDto: SearchTVShowDto) {
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

  async getTVShowByTmdbId(tmdbId: number) {
    const cachedTVShow = await this.cacheService.get<TvShow>(CACHE_KEYS.TV_SHOW_BY_TMDB_ID.prefix(tmdbId));

    if (cachedTVShow) {
      return cachedTVShow;
    }

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

    const tvShowWithScore = {
      ...tvShow,
      tgReviewScore,
    };

    await this.cacheService.set(
      CACHE_KEYS.TV_SHOW_BY_TMDB_ID.prefix(tmdbId),
      tvShowWithScore,
      CACHE_KEYS.TV_SHOW_BY_TMDB_ID.expiration,
    );

    return tvShowWithScore;
  }

  async getTVShowSeasons(tmdbId: number) {
    const cachedSeasons = await this.cacheService.get(CACHE_KEYS.TV_SHOW_SEASONS_BY_TMDB_ID.prefix(tmdbId));

    if (cachedSeasons) {
      return cachedSeasons;
    }

    const tvShow = await this.databaseService.tvShow.findUnique({
      where: { tmdbId },
      select: { seasons: true },
    });

    if (!tvShow) {
      throw new AppException(ERROR_CODES.TV_SHOW_NOT_FOUND);
    }

    const existingSeasons = (tvShow.seasons ?? []) as unknown as TMDBTVShowSeason[];

    if (existingSeasons.length > 0) {
      await this.cacheService.set(
        CACHE_KEYS.TV_SHOW_SEASONS_BY_TMDB_ID.prefix(tmdbId),
        existingSeasons,
        CACHE_KEYS.TV_SHOW_SEASONS_BY_TMDB_ID.expiration,
      );

      return existingSeasons;
    }

    const seasons = await this.integrationsService.tmdb.getTVShowSeasonsById(tmdbId);

    await this.databaseService.tvShow.update({
      where: { tmdbId },
      data: { seasons } as unknown as TvShowUpdateInput,
    });

    await this.cacheService.set(
      CACHE_KEYS.TV_SHOW_SEASONS_BY_TMDB_ID.prefix(tmdbId),
      seasons,
      CACHE_KEYS.TV_SHOW_SEASONS_BY_TMDB_ID.expiration,
    );

    return seasons;
  }

  async getTVShowSeasonEpisodes(tmdbId: number, seasonNumber: number) {
    const cachedEpisodes = await this.cacheService.get(
      CACHE_KEYS.TMDB_TV_SHOW_SEASON_EPISODES_BY_ID.prefix(tmdbId, seasonNumber),
    );

    if (cachedEpisodes) {
      return cachedEpisodes;
    }

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
      await this.cacheService.set(
        CACHE_KEYS.TMDB_TV_SHOW_SEASON_EPISODES_BY_ID.prefix(tmdbId, seasonNumber),
        seasonEpisodes,
        CACHE_KEYS.TMDB_TV_SHOW_SEASON_EPISODES_BY_ID.expiration,
      );

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

    if (await this.cacheService.exists(CACHE_KEYS.TV_SHOW_BY_TMDB_ID.prefix(refreshTVShowDto.tmdbId))) {
      await this.cacheService.delete(CACHE_KEYS.TV_SHOW_BY_TMDB_ID.prefix(refreshTVShowDto.tmdbId));
    }

    if (await this.cacheService.exists(CACHE_KEYS.TV_SHOW_SEASONS_BY_TMDB_ID.prefix(refreshTVShowDto.tmdbId))) {
      await this.cacheService.delete(CACHE_KEYS.TV_SHOW_SEASONS_BY_TMDB_ID.prefix(refreshTVShowDto.tmdbId));
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

    const [tmdbTVShow, seasons] = await Promise.all([
      this.integrationsService.tmdb.getTVShowById(refreshTVShowDto.tmdbId),
      this.integrationsService.tmdb.getTVShowSeasonsById(refreshTVShowDto.tmdbId),
    ]);

    const episodes = (
      await Promise.all(
        seasons.map((season) =>
          this.integrationsService.tmdb
            .getTVShowSeasonEpisdoesById(refreshTVShowDto.tmdbId, season.seasonNumber)
            .then((eps) => eps),
        ),
      )
    ).flat();

    await this.databaseService.tvShow.update({
      where: { tmdbId: refreshTVShowDto.tmdbId },
      data: { ...tmdbTVShow, seasons, episodes } as unknown as TvShowUpdateInput,
    });
  }
}
