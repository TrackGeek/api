import { Injectable } from "@nestjs/common";
import { ProgressStatus } from "@prisma/generated/client";
import { MangaCreateInput, MangaUpdateInput } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import {
  TenraiMangaOrderBy,
  TenraiMangaStatus,
  TenraiMangaType,
  TenraiSort,
} from "@/shared/infra/integrations/tenrai.service";
import type { RefreshMangaDto } from "../dto/refresh-manga.dto";
import type { SearchMangaDto } from "../dto/search-manga.dto";
import { TopMangaDto } from "../dto/top-manga.dto";

@Injectable()
export class MangaService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async searchMangas(searchMangaDto: SearchMangaDto) {
    const tenraiPagination = await this.integrationsService.tenrai.searchMangas(searchMangaDto);

    const items = await Promise.all(
      tenraiPagination.items.map(async (item) => {
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
      ...tenraiPagination,
      items,
    };
  }

  async topMangas(topMangaDto: TopMangaDto) {
    const tenraiPagination = await this.integrationsService.tenrai.topMangas(topMangaDto);

    const items = await Promise.all(
      tenraiPagination.items.map(async (item) => {
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
      ...tenraiPagination,
      items,
    };
  }

  async mangaFilters() {
    const types = Object.values(TenraiMangaType);
    const status = Object.values(TenraiMangaStatus);
    const orderBy = Object.values(TenraiMangaOrderBy);
    const sort = Object.values(TenraiSort);
    const genres = await this.integrationsService.tenrai.getMangaGenres();

    return {
      types,
      genres,
      status,
      orderBy,
      sort,
    };
  }

  async getMangaByMalId(malId: number) {
    let manga = await this.databaseService.manga.findUnique({
      where: { malId },
    });

    if (!manga) {
      const tenraiManga = await this.integrationsService.tenrai.getMangaById(malId);

      manga = await this.databaseService.manga.create({
        data: tenraiManga as unknown as MangaCreateInput,
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

    return mangaWithStats;
  }

  async getMangaRelationsByMalId(malId: number) {
    const manga = await this.databaseService.manga.findUnique({
      where: { malId },
      select: { relations: true },
    });

    if (!manga) {
      throw new AppException(ERROR_CODES.MANGA_NOT_FOUND);
    }

    if (manga.relations) {
      return manga.relations;
    }

    const relations = await this.integrationsService.tenrai.getMangaRelationsById(malId);

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

    const tenraiManga = await this.integrationsService.tenrai.getMangaById(refreshMangaDto.malId);
    const tenraiRelations = await this.integrationsService.tenrai.getMangaRelationsById(refreshMangaDto.malId);

    await this.databaseService.manga.update({
      where: { malId: refreshMangaDto.malId },
      data: { ...tenraiManga, relations: tenraiRelations } as unknown as MangaUpdateInput,
    });

    await this.getMangaByMalId(refreshMangaDto.malId);
  }
}
