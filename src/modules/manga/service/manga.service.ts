import { Injectable } from "@nestjs/common";
import { Manga } from "@prisma/generated/client";

import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import type { RefreshMangaDto } from "../dto/refresh-manga.dto";
import type { SearchMangaDto } from "../dto/search-manga.dto";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { MangaCreateInput, MangaUpdateInput } from "@prisma/generated/models";
import { MangaRecommendationsDto } from "../dto/manga-recommendations.dto";
import {
  JikanMangaOrderBy,
  JikanMangaStatus,
  JikanMangaType,
  JikanSort,
} from "@/shared/infra/integrations/jikan.service";
import { TopMangaDto } from '../dto/top-manga.dto';

@Injectable()
export class MangaService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async searchMangas(searchMangaDto: SearchMangaDto) {
    return this.integrationsService.jikan.searchMangas(searchMangaDto);
  }
  
  async topMangas(topMangaDto: TopMangaDto) {
    return this.integrationsService.jikan.topMangas(topMangaDto);
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

  async mangaRecommendations(mangaRecommendationsDto: MangaRecommendationsDto) {
    return this.integrationsService.jikan.mangaRecommendations(mangaRecommendationsDto);
  }

  async getMangaByMalId(malId: number) {
    const cachedManga = await this.cacheService.get<Manga>(CACHE_KEYS.MANGA_BY_MAL_ID.prefix(malId));

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

    await this.cacheService.set(CACHE_KEYS.MANGA_BY_MAL_ID.prefix(malId), manga, CACHE_KEYS.MANGA_BY_MAL_ID.expiration);

    return manga;
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

    if (await this.cacheService.exists(CACHE_KEYS.MANGA_BY_MAL_ID.prefix(refreshMangaDto.malId))) {
      await this.cacheService.delete(CACHE_KEYS.MANGA_BY_MAL_ID.prefix(refreshMangaDto.malId));
    }

    const jikanManga = await this.integrationsService.jikan.getMangaById(refreshMangaDto.malId);

    await this.databaseService.manga.update({
      where: { malId: refreshMangaDto.malId },
      data: jikanManga as unknown as MangaUpdateInput,
    });

    await this.cacheService.set(
      CACHE_KEYS.MANGA_BY_MAL_ID.prefix(refreshMangaDto.malId),
      manga,
      CACHE_KEYS.MANGA_BY_MAL_ID.expiration,
    );
  }
}
