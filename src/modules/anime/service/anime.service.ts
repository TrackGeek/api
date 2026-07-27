import { Injectable } from "@nestjs/common";
import { ProgressStatus } from "@prisma/generated/client";
import { AnimeCreateInput, AnimeUpdateInput } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService, DEFAULT_PAGINATION_PAGE } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import {
  TenraiAnimeOrderBy,
  TenraiAnimeRatings,
  TenraiAnimeStatus,
  TenraiAnimeType,
  TenraiSort,
} from "@/shared/infra/integrations/tenrai.service";
import { GetAnimeEpisodesByMalIdDto } from "../dto/get-anime-episodes-by-mal-id.dto";
import type { RefreshAnimeDto } from "../dto/refresh-anime.dto";
import type { SearchAnimeDto } from "../dto/search-anime.dto";
import { TopAnimeDto } from "../dto/top-anime.dto";

@Injectable()
export class AnimeService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async searchAnimes(searchAnimeDto: SearchAnimeDto) {
    const tenraiPagination = await this.integrationsService.tenrai.searchAnimes(searchAnimeDto);

    const items = await Promise.all(
      tenraiPagination.items.map(async (item) => {
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
      ...tenraiPagination,
      items,
    };
  }

  async topAnimes(topAnimeDto: TopAnimeDto) {
    const tenraiPagination = await this.integrationsService.tenrai.topAnimes(topAnimeDto);

    const items = await Promise.all(
      tenraiPagination.items.map(async (item) => {
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
      ...tenraiPagination,
      items,
    };
  }

  async animeFilters() {
    const types = Object.values(TenraiAnimeType);
    const status = Object.values(TenraiAnimeStatus);
    const ratings = Object.values(TenraiAnimeRatings);
    const orderBy = Object.values(TenraiAnimeOrderBy);
    const sort = Object.values(TenraiSort);
    const genres = await this.integrationsService.tenrai.getAnimeGenres();

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
    let anime = await this.databaseService.anime.findUnique({
      where: { malId },
      omit: {
        episodes: true,
        relations: true,
      },
    });

    if (!anime) {
      const tenraiAnime = await this.integrationsService.tenrai.getAnimeById(malId);

      anime = await this.databaseService.anime.create({
        data: tenraiAnime as unknown as AnimeCreateInput,
      });
    }

    const tgReviewScore = await this.databaseService.animeReview
      .aggregate({ where: { anime: { malId } }, _avg: { overall: true } })
      .then((result) => (result._avg.overall ? parseFloat(result._avg.overall.toFixed(1)) : 0))
      .catch(() => 0);

    const progressGroups = await this.databaseService.animeProgress.groupBy({
      by: ["status"],
      where: { anime: { malId } },
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

    const animeWithStats = {
      ...anime,
      tgReviewScore,
      progressStats,
    };

    return animeWithStats;
  }

  async getAnimeRelationsByMalId(malId: number) {
    const anime = await this.databaseService.anime.findUnique({
      where: { malId },
      select: { relations: true },
    });

    if (!anime) {
      throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
    }

    if (anime.relations) {
      return anime.relations;
    }

    const relations = await this.integrationsService.tenrai.getAnimeRelationsById(malId);

    await this.databaseService.anime.update({
      where: { malId },
      data: { relations },
    });

    return relations;
  }

  async getAnimeEpisodesByMalId(getAnimeEpisodesByMalIdDto: GetAnimeEpisodesByMalIdDto) {
    const { malId, page = DEFAULT_PAGINATION_PAGE } = getAnimeEpisodesByMalIdDto;
    const pageKey = String(page);

    const anime = await this.databaseService.anime.findUnique({
      where: { malId },
      select: { episodes: true },
    });

    if (!anime) {
      throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
    }

    const storedEpisodes = (anime.episodes ?? {}) as Record<string, unknown>;

    if (storedEpisodes[pageKey]) {
      return storedEpisodes[pageKey];
    }

    const episodes = await this.integrationsService.tenrai.getAnimeEpisodesById(getAnimeEpisodesByMalIdDto);

    await this.databaseService.anime.update({
      where: { malId },
      data: { episodes: { ...storedEpisodes, [pageKey]: episodes } as any },
    });

    return episodes;
  }

  async refreshAnime(refreshAnimeDto: RefreshAnimeDto) {
    const anime = await this.databaseService.anime.findUnique({
      where: { malId: refreshAnimeDto.malId },
      select: {
        lastRefreshedAt: true,
        episodes: true,
      },
    });

    if (!anime) {
      throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
    }

    if (Date.now() - anime.lastRefreshedAt.getTime() < REFRESH_INTERVAL_MS) {
      throw new AppException(ERROR_CODES.ANIME_ALREADY_REFRESHED);
    }

    const existingEpisodes = anime.episodes ?? {};
    const episodesPageKeys = Object.keys(existingEpisodes);

    const tenraiEpisodes: Record<string, any> = {};

    for (const pageKey of episodesPageKeys) {
      const getAnimeEpisodesByMalIdDto: GetAnimeEpisodesByMalIdDto = {
        malId: refreshAnimeDto.malId,
        page: Number(pageKey),
      };

      const episodes = await this.integrationsService.tenrai.getAnimeEpisodesById(getAnimeEpisodesByMalIdDto);

      tenraiEpisodes[pageKey] = episodes;

      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    const tenraiAnime = await this.integrationsService.tenrai.getAnimeById(refreshAnimeDto.malId);
    const tenraiRelations = await this.integrationsService.tenrai.getAnimeRelationsById(refreshAnimeDto.malId);

    await this.databaseService.anime.update({
      where: { malId: refreshAnimeDto.malId },
      data: {
        ...tenraiAnime,
        relations: tenraiRelations,
        episodes: tenraiEpisodes,
      } as unknown as AnimeUpdateInput,
    });

    await this.getAnimeByMalId(refreshAnimeDto.malId);
  }
}
