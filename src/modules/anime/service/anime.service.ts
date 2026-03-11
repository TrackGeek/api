import { Injectable } from "@nestjs/common";
import { Anime } from "@prisma/generated/client";

import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import type { RefreshAnimeDto } from "../dto/refresh-anime.dto";
import type { SearchAnimeDto } from "../dto/search-anime.dto";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { AnimeCreateInput, AnimeUpdateInput } from "@prisma/generated/models";
import {
  JikanAnimeOrderBy,
  JikanAnimeRatings,
  JikanSort,
  JikanAnimeStatus,
  JikanAnimeType,
} from "@/shared/infra/integrations/jikan.service";
import { AnimeRecommendationsDto } from "../dto/anime-recommendations.dto";
import { TopAnimeDto } from "../dto/top-anime.dto";

@Injectable()
export class AnimeService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async searchAnimes(searchAnimeDto: SearchAnimeDto) {
    return this.integrationsService.jikan.searchAnimes({
      ...searchAnimeDto,
      startDate: searchAnimeDto.year,
    });
  }

  async topAnimes(topAnimeDto: TopAnimeDto) {
    return this.integrationsService.jikan.topAnimes(topAnimeDto);
  }

  async animeRecommendations(animeRecommendationsDto: AnimeRecommendationsDto) {
    return this.integrationsService.jikan.animeRecommendations(animeRecommendationsDto);
  }

  async animeFilters() {
    const types = Object.values(JikanAnimeType);
    const status = Object.values(JikanAnimeStatus);
    const ratings = Object.values(JikanAnimeRatings);
    const orderBy = Object.values(JikanAnimeOrderBy);
    const sort = Object.values(JikanSort);
    const genres = await this.integrationsService.jikan.getAnimeGenres();

    return {
      types,
      genres,
      status,
      ratings,
      orderBy,
      sort,
    };
  }

  async getAnimeByMalId(malId: number) {
    const cachedAnime = await this.cacheService.get<Anime>(CACHE_KEYS.ANIME_BY_MAL_ID.prefix(malId));

    if (cachedAnime) {
      return cachedAnime;
    }

    let anime = await this.databaseService.anime.findUnique({
      where: { malId },
    });

    if (!anime) {
      const jikanAnime = await this.integrationsService.jikan.getAnimeById(malId);

      anime = await this.databaseService.anime.create({
        data: jikanAnime as unknown as AnimeCreateInput,
      });
    }

    await this.cacheService.set(CACHE_KEYS.ANIME_BY_MAL_ID.prefix(malId), anime, CACHE_KEYS.ANIME_BY_MAL_ID.expiration);

    return anime;
  }

  async getAnimeEpisodesByMalId(malId: number) {
    const cachedEpisodes = await this.cacheService.get(CACHE_KEYS.ANIME_EPISODES_BY_MAL_ID.prefix(malId));

    if (cachedEpisodes) {
      return cachedEpisodes;
    }

    const anime = await this.databaseService.anime.findUnique({
      where: { malId },
      select: {
        episodes: true,
      },
    });

    if (!anime) {
      throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
    }

    let episodes: any = anime.episodes;

    if (!anime?.episodes) {
      episodes = await this.integrationsService.jikan.getAnimeEpisodesById(malId);

      await this.databaseService.anime.update({
        where: { malId },
        data: { episodes },
      });
    }

    await this.cacheService.set(
      CACHE_KEYS.ANIME_EPISODES_BY_MAL_ID.prefix(malId),
      episodes,
      CACHE_KEYS.ANIME_EPISODES_BY_MAL_ID.expiration,
    );

    return episodes;
  }

  async refreshAnime(refreshAnimeDto: RefreshAnimeDto) {
    const anime = await this.databaseService.anime.findUnique({
      where: { malId: refreshAnimeDto.malId },
      select: {
        lastRefreshedAt: true,
      },
    });

    if (!anime) {
      throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
    }

    if (Date.now() - anime.lastRefreshedAt.getTime() < REFRESH_INTERVAL_MS) {
      throw new AppException(ERROR_CODES.ANIME_ALREADY_REFRESHED);
    }

    if (await this.cacheService.exists(CACHE_KEYS.ANIME_BY_MAL_ID.prefix(refreshAnimeDto.malId))) {
      await this.cacheService.delete(CACHE_KEYS.ANIME_BY_MAL_ID.prefix(refreshAnimeDto.malId));
    }

    const jikanAnime = await this.integrationsService.jikan.getAnimeById(refreshAnimeDto.malId);
    const jikanEpisodes = await this.integrationsService.jikan.getAnimeEpisodesById(refreshAnimeDto.malId);

    await this.databaseService.anime.update({
      where: { malId: refreshAnimeDto.malId },
      data: {
        ...jikanAnime,
        episodes: jikanEpisodes,
      } as unknown as AnimeUpdateInput,
    });

    await this.cacheService.set(
      CACHE_KEYS.ANIME_BY_MAL_ID.prefix(refreshAnimeDto.malId),
      anime,
      CACHE_KEYS.ANIME_BY_MAL_ID.expiration,
    );
  }
}
