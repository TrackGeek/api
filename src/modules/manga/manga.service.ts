import { Injectable } from "@nestjs/common";
import { Manga } from "@prisma/generated/client";

import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { type CacheKeys, CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import type { RefreshMangaDto } from "./dtos/refresh-manga.dto";
import type { SearchMangaDto } from "./dtos/search-manga.dto";

@Injectable()
export class MangaService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  private get cacheKeys(): CacheKeys {
    return {
      mangaById: {
        prefix: (id: number) => `manga:id:${id}`,
        expiration: 3600 * 24, // 24 hours
      },
    };
  }

  async searchMangas(searchMangaDto: SearchMangaDto) {
    return this.integrationsService.jikan.searchMangas(searchMangaDto.query);
  }

  async getMangaById(id: number) {
    const cachedManga = await this.cacheService.get<Manga>(this.cacheKeys.mangaById.prefix(id));

    if (cachedManga) {
      return cachedManga;
    }

    let manga = await this.databaseService.manga.findUnique({
      where: { malId: id },
    });

    if (!manga) {
      const jikanManga = await this.integrationsService.jikan.getMangaById(id);

      manga = await this.databaseService.manga.create({
        data: jikanManga,
      });
    }

    await this.cacheService.set(this.cacheKeys.mangaById.prefix(id), manga, this.cacheKeys.mangaById.expiration);

    return manga;
  }

  async refreshManga(refreshMangaDto: RefreshMangaDto) {
    const manga = await this.databaseService.manga.findUnique({
      where: { malId: refreshMangaDto.id },
    });

    if (!manga) {
      throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
    }

    if (Date.now() - manga.lastRefreshedAt.getTime() < REFRESH_INTERVAL_MS) {
      throw new AppException(ERROR_CODES.ANIME_ALREADY_REFRESHED);
    }

    if (await this.cacheService.exists(this.cacheKeys.mangaById.prefix(manga.malId))) {
      await this.cacheService.delete(this.cacheKeys.mangaById.prefix(manga.malId));
    }

    const jikanManga = await this.integrationsService.jikan.getMangaById(manga.malId);

    await this.databaseService.manga.update({
      where: { malId: refreshMangaDto.id },
      data: jikanManga,
    });

    await this.cacheService.set(
      this.cacheKeys.mangaById.prefix(manga.malId),
      manga,
      this.cacheKeys.mangaById.expiration,
    );
  }
}
