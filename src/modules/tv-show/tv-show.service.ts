import { Injectable } from "@nestjs/common";
import { TvShow } from "@prisma/generated/client";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import { RefreshTVShowDto } from "./dtos/refresh-tv-show.dto";
import type { SearchTVShowDto } from "./dtos/search-tv-show.dto";
import { CACHE_KEYS } from '@/shared/constants/cache';

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
        data: tmdbTVShow,
      });
    }

    await this.cacheService.set(CACHE_KEYS.TV_SHOW_BY_TMDB_ID.prefix(tmdbId), tvShow, CACHE_KEYS.TV_SHOW_BY_TMDB_ID.expiration);

    return tvShow;
  }

  async refreshTVShow(refreshTVShowDto: RefreshTVShowDto) {
    const tvShow = await this.databaseService.tvShow.findUnique({
      where: { tmdbId: refreshTVShowDto.tmdbId },
      select: {
        lastRefreshedAt: true,
      }
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
      data: tmdbTVShow,
    });

    await this.cacheService.set(
      CACHE_KEYS.TV_SHOW_BY_TMDB_ID.prefix(refreshTVShowDto.tmdbId),
      tvShow,
      CACHE_KEYS.TV_SHOW_BY_TMDB_ID.expiration,
    );
  }
}
