import { Injectable } from "@nestjs/common";
import { Anime } from "@prisma/generated/client";

import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { type CacheKeys, CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import type { RefreshAnimeDto } from "./dtos/refresh-anime.dto";
import type { SearchAnimeDto } from "./dtos/search-anime.dto";

@Injectable()
export class AnimeService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  private get cacheKeys(): CacheKeys {
    return {
      animeById: {
        prefix: (id: number) => `anime:id:${id}`,
        expiration: 3600 * 24, // 24 hours
      },
      animeEpisodesById: {
        prefix: (id: number) => `anime:id:${id}:episodes`,
        expiration: 3600 * 24, // 24 hours
      },
    };
  }

  async searchAnimes(searchAnimeDto: SearchAnimeDto) {
    return this.integrationsService.jikan.searchAnimes(searchAnimeDto.query);
  }

  async getAnimeById(id: number) {
    const cachedAnime = await this.cacheService.get<Anime>(this.cacheKeys.animeById.prefix(id));

    if (cachedAnime) {
      return cachedAnime;
    }

    let anime = await this.databaseService.anime.findUnique({
      where: { malId: id },
    });

    if (!anime) {
      const jikanAnime = await this.integrationsService.jikan.getAnimeById(id);

      anime = await this.databaseService.anime.create({
        data: jikanAnime,
      });
    }

    await this.cacheService.set(this.cacheKeys.animeById.prefix(id), anime, this.cacheKeys.animeById.expiration);

    return anime;
  }
  
  async getAnimeEpisodesById(id: number) {
    const cachedEpisodes = await this.cacheService.get(this.cacheKeys.animeEpisodesById.prefix(id));

    if (cachedEpisodes) {
      return cachedEpisodes;
    }

    const anime = await this.databaseService.anime.findUnique({
      where: { malId: id },
    });

    if (!anime) {
      throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
    }
    
    let episodes: any = anime.episodes;
    
    if (!anime?.episodes) {
      episodes = await this.integrationsService.jikan.getAnimeEpisodesById(id);
      
      await this.databaseService.anime.update({
        where: { malId: id },
        data: { episodes },
      });
    }

    await this.cacheService.set(
      this.cacheKeys.animeEpisodesById.prefix(id),
      episodes,
      this.cacheKeys.animeEpisodesById.expiration,
    );

    return episodes;
  }

  async refreshAnime(refreshAnimeDto: RefreshAnimeDto) {
    const anime = await this.databaseService.anime.findUnique({
      where: { malId: refreshAnimeDto.id },
    });

    if (!anime) {
      throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
    }

    if (Date.now() - anime.lastRefreshedAt.getTime() < REFRESH_INTERVAL_MS) {
      throw new AppException(ERROR_CODES.ANIME_ALREADY_REFRESHED);
    }

    if (await this.cacheService.exists(this.cacheKeys.animeById.prefix(anime.malId))) {
      await this.cacheService.delete(this.cacheKeys.animeById.prefix(anime.malId));
    }

    const jikanAnime = await this.integrationsService.jikan.getAnimeById(anime.malId);
    const jikanEpisodes = await this.integrationsService.jikan.getAnimeEpisodesById(anime.malId);

    await this.databaseService.anime.update({
      where: { malId: refreshAnimeDto.id },
      data: {
        ...jikanAnime,
        episodes: jikanEpisodes,
      },
    });

    await this.cacheService.set(
      this.cacheKeys.animeById.prefix(anime.malId),
      anime,
      this.cacheKeys.animeById.expiration,
    );
  }
}
