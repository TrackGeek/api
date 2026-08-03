import { Injectable } from "@nestjs/common";
import { ProgressStatus } from "@prisma/generated/client";
import { BookCreateInput, BookUpdateInput } from "@prisma/generated/models";
import { TopBookDto } from "@/modules/book/dto/top-book.dto";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { HardcoverBookOrderBy, HardcoverSort } from "@/shared/infra/integrations/hardcover.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import { parseIdFromSlug } from "@/shared/utils/string";
import type { RefreshBookDto } from "../dto/refresh-book.dto";
import type { SearchBookDto } from "../dto/search-book.dto";

@Injectable()
export class BookService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async searchBooks(searchBookDto: SearchBookDto) {
    const hardcoverPagination = await this.integrationsService.hardcover.searchBooks(searchBookDto);

    const items = await Promise.all(
      hardcoverPagination.items.map(async (item) => {
        const tgReviewScore = await this.databaseService.bookReview
          .aggregate({ where: { book: { hardcoverId: item.hardcoverId } }, _avg: { overall: true } })
          .then((result) => (result._avg.overall ? parseFloat(result._avg.overall.toFixed(1)) : 0))
          .catch(() => 0);

        const book = await this.databaseService.book.findUnique({
          where: { hardcoverId: item.hardcoverId },
          select: { lastRefreshedAt: true },
        });

        return {
          ...item,
          tgReviewScore,
          lastRefreshedAt: book?.lastRefreshedAt ?? null,
        };
      }),
    );

    return {
      ...hardcoverPagination,
      items,
    };
  }

  async bookFilters() {
    const orderBy = Object.values(HardcoverBookOrderBy);
    const sort = Object.values(HardcoverSort);
    const statuses = await this.integrationsService.hardcover.getBookStatuses();
    const categories = await this.integrationsService.hardcover.getBookCategories();

    return {
      orderBy,
      sort,
      statuses,
      categories,
    };
  }

  async topBooks(topBookDto: TopBookDto) {
    const hardcoverPagination = await this.integrationsService.hardcover.topBooks(topBookDto);

    const items = await Promise.all(
      hardcoverPagination.items.map(async (item) => {
        const tgReviewScore = await this.databaseService.bookReview
          .aggregate({ where: { book: { hardcoverId: item.hardcoverId } }, _avg: { overall: true } })
          .then((result) => (result._avg.overall ? parseFloat(result._avg.overall.toFixed(1)) : 0))
          .catch(() => 0);

        const book = await this.databaseService.book.findUnique({
          where: { hardcoverId: item.hardcoverId },
          select: { lastRefreshedAt: true },
        });

        return {
          ...item,
          tgReviewScore,
          lastRefreshedAt: book?.lastRefreshedAt ?? null,
        };
      }),
    );

    return {
      ...hardcoverPagination,
      items,
    };
  }

  async getBookFranchise(slug: string) {
    const seriesId = parseIdFromSlug(slug);

    if (seriesId === null) {
      throw new AppException(ERROR_CODES.BOOK_FRANCHISE_NOT_FOUND);
    }

    const series = await this.integrationsService.hardcover.getSeriesById(seriesId);

    const trackedBooks = await this.databaseService.book.findMany({
      where: { hardcoverId: { in: series.books.map((book) => book.hardcoverId) } },
      select: { hardcoverId: true, lastRefreshedAt: true, bookReviews: { select: { overall: true } } },
    });

    const books = series.books.map((book) => {
      const tracked = trackedBooks.find((trackedBook) => trackedBook.hardcoverId === book.hardcoverId);
      const reviews = tracked?.bookReviews ?? [];
      const tgReviewScore = reviews.length
        ? parseFloat((reviews.reduce((sum, review) => sum + Number(review.overall), 0) / reviews.length).toFixed(1))
        : 0;

      return {
        ...book,
        tgReviewScore,
        lastRefreshedAt: tracked?.lastRefreshedAt ?? null,
      };
    });

    return { ...series, books };
  }

  async getBookByHardcoverId(hardcoverId: number) {
    let book = await this.databaseService.book.findUnique({
      where: { hardcoverId },
    });

    if (!book) {
      const hardcoverBook = await this.integrationsService.hardcover.getBookByHardcoverId(hardcoverId);

      book = await this.databaseService.book.create({
        data: hardcoverBook as unknown as BookCreateInput,
      });
    }

    const tgReviewScore = await this.databaseService.bookReview
      .aggregate({ where: { book: { hardcoverId } }, _avg: { overall: true } })
      .then((result) => (result._avg.overall ? parseFloat(result._avg.overall.toFixed(1)) : 0))
      .catch(() => 0);

    const progressGroups = await this.databaseService.bookProgress.groupBy({
      by: ["status"],
      where: { book: { hardcoverId } },
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
      planToRead: getStats(ProgressStatus.Planning),
      dropped: getStats(ProgressStatus.Dropped),
    };

    const bookWithStats = {
      ...book,
      tgReviewScore,
      progressStats,
    };

    return bookWithStats;
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

    const hardcoverBook = await this.integrationsService.hardcover.getBookByHardcoverId(refreshBookDto.hardcoverId);

    await this.databaseService.book.update({
      where: { hardcoverId: refreshBookDto.hardcoverId },
      data: hardcoverBook as unknown as BookUpdateInput,
    });

    await this.getBookByHardcoverId(refreshBookDto.hardcoverId);
  }
}
