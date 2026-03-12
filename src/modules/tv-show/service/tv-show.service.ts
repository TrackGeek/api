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
    return this.integrationsService.tmdb.searchTVShows(searchTVShowDto.query);
  }

  async topTVShows(topTvShowDto: TopTvShowDto) {
    return this.integrationsService.tmdb.topTVShows(topTvShowDto);
  }

  async getTVShowByTmdbId(tmdbId: number) {
    const cachedTVShow = await this.cacheService.get<TvShow>(CACHE_KEYS.TV_SHOW_BY_TMDB_ID.prefix(tmdbId));

    if (cachedTVShow) {
      return cachedTVShow;
    }

    let tvShow = await this.databaseService.tvShow.findUnique({
      where: { tmdbId },
    });

    if (!tvShow) {
      const tmdbTVShow = await this.integrationsService.tmdb.getTVShowById(tmdbId);

      tvShow = await this.databaseService.tvShow.create({
        data: tmdbTVShow as unknown as TvShowCreateInput,
      });
    }

    await this.cacheService.set(
      CACHE_KEYS.TV_SHOW_BY_TMDB_ID.prefix(tmdbId),
      tvShow,
      CACHE_KEYS.TV_SHOW_BY_TMDB_ID.expiration,
    );

    return tvShow;
  }

  async getTVShowSeasonsByTmdbId(tmdbId: number) {
    const cachedSeasons = await this.cacheService.get(CACHE_KEYS.TV_SHOW_SEASONS_BY_TMDB_ID.prefix(tmdbId));

    if (cachedSeasons) {
      return cachedSeasons;
    }

    const tvShow = await this.databaseService.tvShow.findUnique({
      where: { tmdbId },
      select: {
        seasons: true,
      },
    });

    if (!tvShow) {
      throw new AppException(ERROR_CODES.TV_SHOW_NOT_FOUND);
    }

    let seasons: any = tvShow.seasons;

    if (!seasons) {
      seasons = await this.integrationsService.tmdb.getTVShowSeasonsById(tmdbId);

      await this.databaseService.tvShow.update({
        where: { tmdbId },
        data: { seasons },
      });
    }

    await this.cacheService.set(
      CACHE_KEYS.TV_SHOW_SEASONS_BY_TMDB_ID.prefix(tmdbId),
      seasons,
      CACHE_KEYS.TV_SHOW_SEASONS_BY_TMDB_ID.expiration,
    );

    return seasons;
  }

  async refreshTVShow(refreshTVShowDto: RefreshTVShowDto) {
    const tvShow = await this.databaseService.tvShow.findUnique({
      where: { tmdbId: refreshTVShowDto.tmdbId },
      select: {
        lastRefreshedAt: true,
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

    const tmdbTVShow = await this.integrationsService.tmdb.getTVShowById(refreshTVShowDto.tmdbId);

    await this.databaseService.tvShow.update({
      where: { tmdbId: refreshTVShowDto.tmdbId },
      data: tmdbTVShow as unknown as TvShowUpdateInput,
    });

    await this.cacheService.set(
      CACHE_KEYS.TV_SHOW_BY_TMDB_ID.prefix(refreshTVShowDto.tmdbId),
      tvShow,
      CACHE_KEYS.TV_SHOW_BY_TMDB_ID.expiration,
    );
  }
}
