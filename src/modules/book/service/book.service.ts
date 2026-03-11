import { Injectable } from "@nestjs/common";
import { Book } from "@prisma/generated/client";

import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import type { RefreshBookDto } from "../dto/refresh-book.dto";
import type { SearchBookDto } from "../dto/search-book.dto";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { BookCreateInput, BookUpdateInput } from "@prisma/generated/models";

@Injectable()
export class BookService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async searchBooks(searchBookDto: SearchBookDto) {
    return this.integrationsService.hardcover.searchBooks(searchBookDto.query);
  }

  async getBookByHardcoverId(hardcoverId: number) {
    const cachedBook = await this.cacheService.get<Book>(CACHE_KEYS.BOOK_BY_HARDCOVER_ID.prefix(hardcoverId));

    if (cachedBook) {
      return cachedBook;
    }

    let book = await this.databaseService.book.findUnique({
      where: { hardcoverId },
    });

    if (!book) {
      const hardcoverBook = await this.integrationsService.hardcover.getBookByHardcoverId(hardcoverId);

      book = await this.databaseService.book.create({
        data: hardcoverBook as unknown as BookCreateInput,
      });
    }

    await this.cacheService.set(
      CACHE_KEYS.BOOK_BY_HARDCOVER_ID.prefix(hardcoverId),
      book,
      CACHE_KEYS.BOOK_BY_HARDCOVER_ID.expiration,
    );

    return book;
  }

  async refreshBook(refreshBookDto: RefreshBookDto) {
    const book = await this.databaseService.book.findUnique({
      where: { hardcoverId: refreshBookDto.hardcoverId },
      select: {
        lastRefreshedAt: true,
      },
    });

    if (!book) {
      throw new AppException(ERROR_CODES.BOOK_NOT_FOUND);
    }

    if (Date.now() - book.lastRefreshedAt.getTime() < REFRESH_INTERVAL_MS) {
      throw new AppException(ERROR_CODES.BOOK_ALREADY_REFRESHED);
    }

    if (await this.cacheService.exists(CACHE_KEYS.BOOK_BY_HARDCOVER_ID.prefix(refreshBookDto.hardcoverId))) {
      await this.cacheService.delete(CACHE_KEYS.BOOK_BY_HARDCOVER_ID.prefix(refreshBookDto.hardcoverId));
    }

    const hardcoverBook = await this.integrationsService.hardcover.getBookByHardcoverId(refreshBookDto.hardcoverId);

    await this.databaseService.book.update({
      where: { hardcoverId: refreshBookDto.hardcoverId },
      data: hardcoverBook as unknown as BookUpdateInput,
    });

    await this.cacheService.set(
      CACHE_KEYS.BOOK_BY_HARDCOVER_ID.prefix(refreshBookDto.hardcoverId),
      book,
      CACHE_KEYS.BOOK_BY_HARDCOVER_ID.expiration,
    );
  }
}
