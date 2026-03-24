import { Injectable } from "@nestjs/common";
import { Anime } from "@prisma/generated/client";
import { AnimeCreateInput, AnimeUpdateInput } from "@prisma/generated/models";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import {
  JikanAnimeEpisode,
  JikanAnimeOrderBy,
  JikanAnimeRatings,
  JikanAnimeStatus,
  JikanAnimeType,
  JikanPagination,
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
    return this.integrationsService.jikan.searchAnimes({
      ...searchAnimeDto,
      startDate: searchAnimeDto.year,
    });
  }

  async topAnimes(topAnimeDto: TopAnimeDto) {
    return this.integrationsService.jikan.topAnimes(topAnimeDto);
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

  async getAnimeEpisodesByMalId(getAnimeEpisodesByMalIdDto: GetAnimeEpisodesByMalIdDto) {
    const cachedEpisodesKey = CACHE_KEYS.ANIME_EPISODES_BY_MAL_ID.prefix(getAnimeEpisodesByMalIdDto);
    const cachedEpisodes = await this.cacheService.get(cachedEpisodesKey);

    if (cachedEpisodes) {
      return cachedEpisodes;
    }

    const anime = await this.databaseService.anime.findUnique({
      where: { malId: getAnimeEpisodesByMalIdDto.malId },
      select: { episodes: true },
    });

    if (!anime) {
      throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
    }

    const JIKAN_EPISODES_PER_PAGE = 100;
    const page = getAnimeEpisodesByMalIdDto.page ?? 1;
    const existingEpisodes = (anime.episodes ?? []) as unknown as JikanAnimeEpisode[];
    const pageStart = (page - 1) * JIKAN_EPISODES_PER_PAGE;
    const pageEnd = page * JIKAN_EPISODES_PER_PAGE;
    const pageEpisodes = existingEpisodes.slice(pageStart, pageEnd);

    const hasFullPage = pageEpisodes.length === JIKAN_EPISODES_PER_PAGE;

    if (hasFullPage) {
      const result: JikanPagination<JikanAnimeEpisode> = {
        hasNextPage: existingEpisodes.length > pageEnd,
        nextCursor: existingEpisodes.length > pageEnd ? page + 1 : null,
        items: pageEpisodes,
      };

      await this.cacheService.set(cachedEpisodesKey, result, CACHE_KEYS.ANIME_EPISODES_BY_MAL_ID.expiration);

      return result;
    }

    const episodes = await this.integrationsService.jikan.getAnimeEpisodesById(getAnimeEpisodesByMalIdDto);

    const existingNumbers = new Set(existingEpisodes.map((ep) => ep.episodeNumber));
    const newEpisodes = episodes.items.filter((ep) => !existingNumbers.has(ep.episodeNumber));

    if (newEpisodes.length > 0) {
      await this.databaseService.anime.update({
        where: { malId: getAnimeEpisodesByMalIdDto.malId },
        data: { episodes: [...existingEpisodes, ...newEpisodes] } as unknown as AnimeUpdateInput,
      });
    }

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

    if (await this.cacheService.exists(CACHE_KEYS.ANIME_BY_MAL_ID.prefix(refreshAnimeDto.malId))) {
      await this.cacheService.delete(CACHE_KEYS.ANIME_BY_MAL_ID.prefix(refreshAnimeDto.malId));
    }

    const jikanAnime = await this.integrationsService.jikan.getAnimeById(refreshAnimeDto.malId);

    await this.databaseService.anime.update({
      where: { malId: refreshAnimeDto.malId },
      data: { ...jikanAnime } as unknown as AnimeUpdateInput,
    });

    await this.cacheService.set(
      CACHE_KEYS.ANIME_BY_MAL_ID.prefix(refreshAnimeDto.malId),
      anime,
      CACHE_KEYS.ANIME_BY_MAL_ID.expiration,
    );
  }
}
