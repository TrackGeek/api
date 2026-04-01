import { Injectable } from "@nestjs/common";
import { Manga, ProgressStatus } from "@prisma/generated/client";
import { MangaCreateInput, MangaUpdateInput } from "@prisma/generated/models";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import {
  JikanMangaOrderBy,
  JikanMangaStatus,
  JikanMangaType,
  JikanSort,
} from "@/shared/infra/integrations/jikan.service";
import type { RefreshMangaDto } from "../dto/refresh-manga.dto";
import type { SearchMangaDto } from "../dto/search-manga.dto";
import { TopMangaDto } from "../dto/top-manga.dto";

@Injectable()
export class MangaService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async searchMangas(searchMangaDto: SearchMangaDto) {
    const jikanPagination = await this.integrationsService.jikan.searchMangas({
      ...searchMangaDto,
      startDate: searchMangaDto.year ? `${searchMangaDto.year}-01-01` : undefined,
      endDate: searchMangaDto.year ? `${searchMangaDto.year}-12-31` : undefined,
    });

    const items = await Promise.all(
      jikanPagination.items.map(async (item) => {
        const tgReviewScore = await this.databaseService.mangaReview
          .aggregate({ where: { manga: { malId: item.malId } }, _avg: { overall: true } })
          .then((result) => (result._avg.overall ? parseFloat(result._avg.overall.toFixed(1)) : 0))
          .catch(() => 0);

        const manga = await this.databaseService.manga.findUnique({
          where: { malId: item.malId },
          select: { lastRefreshedAt: true },
        });

        return {
          ...item,
          tgReviewScore,
          lastRefreshedAt: manga?.lastRefreshedAt ?? null,
        };
      }),
    );

    return {
      ...jikanPagination,
      items,
    };
  }

  async topMangas(topMangaDto: TopMangaDto) {
    const jikanPagination = await this.integrationsService.jikan.topMangas(topMangaDto);

    const items = await Promise.all(
      jikanPagination.items.map(async (item) => {
        const tgReviewScore = await this.databaseService.mangaReview
          .aggregate({ where: { manga: { malId: item.malId } }, _avg: { overall: true } })
          .then((result) => (result._avg.overall ? parseFloat(result._avg.overall.toFixed(1)) : 0))
          .catch(() => 0);

        const manga = await this.databaseService.manga.findUnique({
          where: { malId: item.malId },
          select: { lastRefreshedAt: true },
        });

        return {
          ...item,
          tgReviewScore,
          lastRefreshedAt: manga?.lastRefreshedAt ?? null,
        };
      }),
    );

    return {
      ...jikanPagination,
      items,
    };
  }

  async mangaFilters() {
    const types = Object.values(JikanMangaType);
    const status = Object.values(JikanMangaStatus);
    const orderBy = Object.values(JikanMangaOrderBy);
    const sort = Object.values(JikanSort);
    const genres = await this.integrationsService.jikan.getMangaGenres();

    return {
      types,
      genres,
      status,
      orderBy,
      sort,
    };
  }

  async getMangaByMalId(malId: number) {
    const mangaDetailKey = CACHE_KEYS.MANGA_BY_MAL_ID.prefix(malId);

    const cachedManga = await this.cacheService.get<Manga>(mangaDetailKey);

    if (cachedManga) {
      return cachedManga;
    }

    let manga = await this.databaseService.manga.findUnique({
      where: { malId },
    });

    if (!manga) {
      const jikanManga = await this.integrationsService.jikan.getMangaById(malId);

      manga = await this.databaseService.manga.create({
        data: jikanManga as unknown as MangaCreateInput,
      });
    }

    const tgReviewScore = await this.databaseService.mangaReview
      .aggregate({ where: { manga: { malId } }, _avg: { overall: true } })
      .then((result) => (result._avg.overall ? parseFloat(result._avg.overall.toFixed(1)) : 0))
      .catch(() => 0);

    const progressGroups = await this.databaseService.mangaProgress.groupBy({
      by: ["status"],
      where: { manga: { malId } },
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

    const mangaWithStats = {
      ...manga,
      tgReviewScore,
      progressStats,
    };

    await this.cacheService.set(mangaDetailKey, mangaWithStats, CACHE_KEYS.MANGA_BY_MAL_ID.expiration);

    return mangaWithStats;
  }

  async getMangaRelationsByMalId(malId: number) {
    const cachedRelationsKey = CACHE_KEYS.MANGA_RELATIONS_BY_MAL_ID.prefix(malId);
    const cachedRelations = await this.cacheService.get(cachedRelationsKey);

    if (cachedRelations) {
      return cachedRelations;
    }

    const manga = await this.databaseService.manga.findUnique({
      where: { malId },
      select: { relations: true },
    });

    if (!manga) {
      throw new AppException(ERROR_CODES.MANGA_NOT_FOUND);
    }

    if (manga.relations) {
      await this.cacheService.set(cachedRelationsKey, manga.relations, CACHE_KEYS.MANGA_RELATIONS_BY_MAL_ID.expiration);

      return manga.relations;
    }

    const relations = await this.integrationsService.jikan.getMangaRelationsById(malId);

    await this.cacheService.set(cachedRelationsKey, relations, CACHE_KEYS.MANGA_RELATIONS_BY_MAL_ID.expiration);

    await this.databaseService.manga.update({
      where: { malId },
      data: { relations },
    });

    return relations;
  }

  async refreshManga(refreshMangaDto: RefreshMangaDto) {
    const manga = await this.databaseService.manga.findUnique({
      where: { malId: refreshMangaDto.malId },
      select: {
        lastRefreshedAt: true,
      },
    });

    if (!manga) {
      throw new AppException(ERROR_CODES.MANGA_NOT_FOUND);
    }

    if (Date.now() - manga.lastRefreshedAt.getTime() < REFRESH_INTERVAL_MS) {
      throw new AppException(ERROR_CODES.MANGA_ALREADY_REFRESHED);
    }

    const mangaDetailKey = CACHE_KEYS.MANGA_BY_MAL_ID.prefix(refreshMangaDto.malId);

    if (await this.cacheService.exists(mangaDetailKey)) {
      await this.cacheService.delete(mangaDetailKey);
    }

    const jikanManga = await this.integrationsService.jikan.getMangaById(refreshMangaDto.malId);
    const jikanRelations = await this.integrationsService.jikan.getMangaRelationsById(refreshMangaDto.malId);

    await this.databaseService.manga.update({
      where: { malId: refreshMangaDto.malId },
      data: { ...jikanManga, relations: jikanRelations } as unknown as MangaUpdateInput,
    });

    await this.cacheService.set(mangaDetailKey, manga, CACHE_KEYS.MANGA_BY_MAL_ID.expiration);
  }
}
