import { Injectable } from "@nestjs/common";
import { Anime } from "@prisma/generated/client";
import { AnimeCreateInput, AnimeUpdateInput } from "@prisma/generated/models";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService, DEFAULT_PAGINATION_PAGE } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import {
  JikanAnimeOrderBy,
  JikanAnimeRatings,
  JikanAnimeStatus,
  JikanAnimeType,
  JikanSort,
} from "@/shared/infra/integrations/jikan.service";
import type { RefreshAnimeDto } from "../dto/refresh-anime.dto";
import type { SearchAnimeDto } from "../dto/search-anime.dto";
import { TopAnimeDto } from "../dto/top-anime.dto";
import { GetAnimeEpisodesByMalIdDto } from "../dto/get-anime-episodes-by-mal-id.dto";

@Injectable()
export class AnimeService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async searchAnimes(searchAnimeDto: SearchAnimeDto) {
    const jikanPagination = await this.integrationsService.jikan.searchAnimes({
      ...searchAnimeDto,
      startDate: searchAnimeDto.year ? `${searchAnimeDto.year}-01-01` : undefined,
      endDate: searchAnimeDto.year ? `${searchAnimeDto.year}-12-31` : undefined,
    });

    const items = await Promise.all(
      jikanPagination.items.map(async (item) => {
        const tgReviewScore = await this.databaseService.animeReview
          .aggregate({ where: { anime: { malId: item.malId } }, _avg: { overall: true } })
          .then((result) => (result._avg.overall ? parseFloat(result._avg.overall.toFixed(1)) : 0))
          .catch(() => 0);

        const anime = await this.databaseService.anime.findUnique({
          where: { malId: item.malId },
          select: { lastRefreshedAt: true },
        });

        return {
          ...item,
          tgReviewScore,
          lastRefreshedAt: anime?.lastRefreshedAt ?? null,
        };
      }),
    );

    return {
      ...jikanPagination,
      items,
    };
  }

  async topAnimes(topAnimeDto: TopAnimeDto) {
    const jikanPagination = await this.integrationsService.jikan.topAnimes(topAnimeDto);

    const items = await Promise.all(
      jikanPagination.items.map(async (item) => {
        const tgReviewScore = await this.databaseService.animeReview
          .aggregate({ where: { anime: { malId: item.malId } }, _avg: { overall: true } })
          .then((result) => (result._avg.overall ? parseFloat(result._avg.overall.toFixed(1)) : 0))
          .catch(() => 0);

        const anime = await this.databaseService.anime.findUnique({
          where: { malId: item.malId },
          select: { lastRefreshedAt: true },
        });

        return {
          ...item,
          tgReviewScore,
          lastRefreshedAt: anime?.lastRefreshedAt ?? null,
        };
      }),
    );

    return {
      ...jikanPagination,
      items,
    };
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
    const animeDetailKey = CACHE_KEYS.ANIME_BY_MAL_ID.prefix(malId);

    const cachedAnime = await this.cacheService.get<Anime>(animeDetailKey);

    if (cachedAnime) {
      return cachedAnime;
    }

    let anime = await this.databaseService.anime.findUnique({
      where: { malId },
      omit: {
        episodes: true,
      },
    });

    if (!anime) {
      const jikanAnime = await this.integrationsService.jikan.getAnimeById(malId);

      anime = await this.databaseService.anime.create({
        data: jikanAnime as unknown as AnimeCreateInput,
      });
    }

    const tgReviewScore = await this.databaseService.animeReview
      .aggregate({ where: { anime: { malId } }, _avg: { overall: true } })
      .then((result) => (result._avg.overall ? parseFloat(result._avg.overall.toFixed(1)) : 0))
      .catch(() => 0);

    const animeWithScore = {
      ...anime,
      tgReviewScore,
    };

    await this.cacheService.set(animeDetailKey, animeWithScore, CACHE_KEYS.ANIME_BY_MAL_ID.expiration);

    return animeWithScore;
  }

  async getAnimeEpisodesByMalId(getAnimeEpisodesByMalIdDto: GetAnimeEpisodesByMalIdDto) {
    const { malId, page = DEFAULT_PAGINATION_PAGE } = getAnimeEpisodesByMalIdDto;
    const pageKey = String(page);

    const cachedEpisodesKey = CACHE_KEYS.ANIME_EPISODES_BY_MAL_ID.prefix(getAnimeEpisodesByMalIdDto);
    const cachedEpisodes = await this.cacheService.get(cachedEpisodesKey);

    if (cachedEpisodes) {
      return cachedEpisodes;
    }

    const anime = await this.databaseService.anime.findUnique({
      where: { malId },
      select: { episodes: true },
    });

    if (!anime) {
      throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
    }

    const storedEpisodes = (anime.episodes ?? {}) as Record<string, unknown>;

    if (storedEpisodes[pageKey]) {
      await this.cacheService.set(
        cachedEpisodesKey,
        storedEpisodes[pageKey],
        CACHE_KEYS.ANIME_EPISODES_BY_MAL_ID.expiration,
      );

      return storedEpisodes[pageKey];
    }

    const episodes = await this.integrationsService.jikan.getAnimeEpisodesById(getAnimeEpisodesByMalIdDto);

    await this.databaseService.anime.update({
      where: { malId },
      data: { episodes: { ...storedEpisodes, [pageKey]: episodes } as any },
    });

    await this.cacheService.set(cachedEpisodesKey, episodes, CACHE_KEYS.ANIME_EPISODES_BY_MAL_ID.expiration);

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

    const animeDetailKey = CACHE_KEYS.ANIME_BY_MAL_ID.prefix(refreshAnimeDto.malId);

    if (await this.cacheService.exists(animeDetailKey)) {
      await this.cacheService.delete(animeDetailKey);
    }

    const jikanAnime = await this.integrationsService.jikan.getAnimeById(refreshAnimeDto.malId);

    await this.databaseService.anime.update({
      where: { malId: refreshAnimeDto.malId },
      data: { ...jikanAnime } as unknown as AnimeUpdateInput,
    });

    await this.cacheService.set(animeDetailKey, anime, CACHE_KEYS.ANIME_BY_MAL_ID.expiration);
  }
}
