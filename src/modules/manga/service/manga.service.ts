import { Injectable } from "@nestjs/common";
import { ProgressStatus } from "@prisma/generated/client";
import { MangaCreateInput, MangaUpdateInput } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import {
  DatabaseService,
  DEFAULT_PAGINATION_ITEMS_PER_PAGE,
  DEFAULT_PAGINATION_PAGE,
} from "@/shared/infra/database/database.service";
import {
  type AnilistMangaDetails,
  AnilistMangaOrderBy,
  AnilistMangaStatus,
  AnilistMangaType,
  type AnilistPagination,
  type AnilistSearchManga,
  AnilistSort,
} from "@/shared/infra/integrations/anilist.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import {
  compareBy,
  getTgScoredContent,
  matchesAllNames,
  matchesQuery,
  normalizeToken,
  paginateLocal,
  toNameList,
} from "@/shared/utils/tg-review-search";
import type { RefreshMangaDto } from "../dto/refresh-manga.dto";
import type { SearchMangaDto } from "../dto/search-manga.dto";
import { TopMangaDto } from "../dto/top-manga.dto";

const MANGA_STATUS_LABELS: Record<AnilistMangaStatus, string> = {
  [AnilistMangaStatus.Publishing]: "Publishing",
  [AnilistMangaStatus.Complete]: "Finished",
  [AnilistMangaStatus.Hiatus]: "On Hiatus",
  [AnilistMangaStatus.Discontinued]: "Discontinued",
  [AnilistMangaStatus.Upcoming]: "Not yet published",
};

export interface ReviewedMangaSortable {
  title: string;
  publishedFrom: string | null;
  publishedTo: string | null;
  popularity: number;
  tgReviewScore: number;
}

const MANGA_ORDER_BY_VALUE: Record<AnilistMangaOrderBy, (manga: ReviewedMangaSortable) => number | string | null> = {
  [AnilistMangaOrderBy.Title]: (manga) => manga.title.toLowerCase(),
  [AnilistMangaOrderBy.StartDate]: (manga) => (manga.publishedFrom ? new Date(manga.publishedFrom).getTime() : 0),
  [AnilistMangaOrderBy.EndDate]: (manga) => (manga.publishedTo ? new Date(manga.publishedTo).getTime() : 0),
  [AnilistMangaOrderBy.Score]: (manga) => manga.tgReviewScore,
  [AnilistMangaOrderBy.Popularity]: (manga) => manga.popularity,
};

@Injectable()
export class MangaService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async searchMangas(searchMangaDto: SearchMangaDto) {
    if (searchMangaDto.minTgScore != null) {
      return this.searchReviewedMangas(searchMangaDto);
    }

    const anilistPagination = await this.integrationsService.anilist.searchMangas(searchMangaDto);

    return this.withCommunityData(anilistPagination);
  }

  /**
   * The TrackGeek rating filter can only match mangas we already store, so it searches our own
   * records instead of Anilist — which keeps pagination and totals accurate.
   */
  private async searchReviewedMangas({
    page = DEFAULT_PAGINATION_PAGE,
    query,
    type,
    status,
    genres,
    year,
    orderBy = AnilistMangaOrderBy.Score,
    sort = AnilistSort.Desc,
    minTgScore = 0,
  }: SearchMangaDto) {
    const scored = await getTgScoredContent(this.databaseService.mangaReview, "mangaId", minTgScore);
    const scoreById = new Map(scored.map((entry) => [entry.id, entry.tgReviewScore]));

    const mangas = await this.databaseService.manga.findMany({
      where: { id: { in: [...scoreById.keys()] } },
      select: {
        id: true,
        anilistId: true,
        malId: true,
        title: true,
        type: true,
        status: true,
        genres: true,
        tags: true,
        imageUrl: true,
        bannerUrl: true,
        isAdult: true,
        anilistScore: true,
        synopsis: true,
        popularity: true,
        published: true,
        lastRefreshedAt: true,
      },
    });

    const items = mangas
      .map((manga) => {
        const published = manga.published as { from?: string | null; to?: string | null } | null;

        return {
          anilistId: manga.anilistId,
          malId: manga.malId,
          title: manga.title,
          type: manga.type,
          publishedFrom: published?.from ?? null,
          publishedTo: published?.to ?? null,
          status: manga.status,
          anilistScore: manga.anilistScore,
          synopsis: manga.synopsis,
          imageUrl: manga.imageUrl,
          bannerUrl: manga.bannerUrl,
          genres: toNameList(manga.genres),
          // Anilist splits genres and tags, and the UI offers both under a single genre filter.
          searchableGenres: [...toNameList(manga.genres), ...toNameList(manga.tags)],
          isAdult: manga.isAdult ?? false,
          popularity: manga.popularity ?? 0,
          releaseYear: published?.from ? new Date(published.from).getFullYear() : null,
          tgReviewScore: scoreById.get(manga.id) ?? 0,
          lastRefreshedAt: manga.lastRefreshedAt,
        };
      })
      .filter((manga) => matchesQuery(manga.title, query))
      .filter((manga) => !type || normalizeToken(manga.type) === normalizeToken(type))
      .filter((manga) => !status || normalizeToken(manga.status) === normalizeToken(MANGA_STATUS_LABELS[status]))
      .filter((manga) => matchesAllNames(manga.searchableGenres, genres))
      .filter((manga) => !year || String(manga.releaseYear ?? "") === year)
      .map(({ searchableGenres: _searchableGenres, ...manga }) => manga);

    const sorted = compareBy(items, MANGA_ORDER_BY_VALUE[orderBy], sort);

    return paginateLocal(sorted, page, DEFAULT_PAGINATION_ITEMS_PER_PAGE);
  }

  async topMangas(topMangaDto: TopMangaDto) {
    const anilistPagination = await this.integrationsService.anilist.topMangas(topMangaDto);

    return this.withCommunityData(anilistPagination);
  }

  async mangaFilters() {
    const types = Object.values(AnilistMangaType);
    const status = Object.values(AnilistMangaStatus);
    const orderBy = Object.values(AnilistMangaOrderBy);
    const sort = Object.values(AnilistSort);
    const genres = await this.integrationsService.anilist.getMangaGenres();

    return {
      types,
      genres,
      status,
      orderBy,
      sort,
    };
  }

  async getMangaByAnilistId(anilistId: number) {
    const manga =
      (await this.databaseService.manga.findUnique({ where: { anilistId } })) ??
      (await this.saveManga(await this.fetchFromAnilist(anilistId)));

    const tgReviewScore = await this.databaseService.mangaReview
      .aggregate({ where: { mangaId: manga.id }, _avg: { overall: true } })
      .then((result) => (result._avg.overall ? parseFloat(result._avg.overall.toFixed(1)) : 0))
      .catch(() => 0);

    const progressGroups = await this.databaseService.mangaProgress.groupBy({
      by: ["status"],
      where: { mangaId: manga.id },
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
      reading: getStats(ProgressStatus.Reading),
      completed: getStats(ProgressStatus.Completed),
      planning: getStats(ProgressStatus.Planning),
      paused: getStats(ProgressStatus.Paused),
      dropped: getStats(ProgressStatus.Dropped),
    };

    return {
      ...manga,
      tgReviewScore,
      progressStats,
    };
  }

  async getMangaRelationsByAnilistId(anilistId: number) {
    const manga = await this.databaseService.manga.findUnique({
      where: { anilistId },
      select: { relations: true },
    });

    if (!manga) {
      throw new AppException(ERROR_CODES.MANGA_NOT_FOUND);
    }

    if (manga.relations) {
      return manga.relations;
    }

    const relations = await this.integrationsService.anilist.getMangaRelationsById(anilistId);

    await this.databaseService.manga.update({
      where: { anilistId },
      data: { relations } as unknown as MangaUpdateInput,
    });

    return relations;
  }

  async refreshManga(refreshMangaDto: RefreshMangaDto) {
    const manga = await this.databaseService.manga.findUnique({
      where: { anilistId: refreshMangaDto.anilistId },
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

    await this.saveManga(await this.fetchFromAnilist(refreshMangaDto.anilistId));
  }

  /** Legacy links carry the MAL id, so an unknown AniList id falls back to a MAL lookup. */
  private async fetchFromAnilist(id: number) {
    try {
      return await this.integrationsService.anilist.getMangaById(id);
    } catch (error) {
      if (error instanceof AppException && error.getStatus() === ERROR_CODES.MANGA_NOT_FOUND.status) {
        return this.integrationsService.anilist.getMangaByMalId(id);
      }

      throw error;
    }
  }

  /** Rows created from MyAnimeList keep their progress/reviews: they are adopted by malId. */
  private async saveManga(anilistManga: AnilistMangaDetails) {
    const { publishedFrom: _publishedFrom, ...manga } = anilistManga;

    const data = { ...manga, lastRefreshedAt: new Date() };

    const existing = await this.databaseService.manga.findFirst({
      where: {
        OR: [{ anilistId: manga.anilistId }, ...(manga.malId ? [{ malId: manga.malId }] : [])],
      },
      select: { id: true },
    });

    if (existing) {
      return this.databaseService.manga.update({
        where: { id: existing.id },
        data: data as unknown as MangaUpdateInput,
      });
    }

    return this.databaseService.manga.create({ data: data as unknown as MangaCreateInput });
  }

  private async withCommunityData(pagination: AnilistPagination<AnilistSearchManga>) {
    const anilistIds = pagination.items.map((item) => item.anilistId);

    const mangas = await this.databaseService.manga.findMany({
      where: { anilistId: { in: anilistIds } },
      select: { id: true, anilistId: true, lastRefreshedAt: true },
    });

    const reviewScores = await this.databaseService.mangaReview.groupBy({
      by: ["mangaId"],
      where: { mangaId: { in: mangas.map((manga) => manga.id) } },
      _avg: { overall: true },
    });

    const scoreByMangaId = new Map(
      reviewScores.map((score) => [score.mangaId, score._avg.overall ? parseFloat(score._avg.overall.toFixed(1)) : 0]),
    );

    const mangaByAnilistId = new Map(mangas.map((manga) => [manga.anilistId, manga]));

    const items = pagination.items.map((item) => {
      const manga = mangaByAnilistId.get(item.anilistId);

      return {
        ...item,
        tgReviewScore: manga ? (scoreByMangaId.get(manga.id) ?? 0) : 0,
        lastRefreshedAt: manga?.lastRefreshedAt ?? null,
      };
    });

    return {
      ...pagination,
      items,
    };
  }
}
