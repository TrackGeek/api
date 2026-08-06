import { Injectable } from "@nestjs/common";
import { ProgressStatus } from "@prisma/generated/client";
import { BookCreateInput, BookUpdateInput } from "@prisma/generated/models";
import { TopBookDto } from "@/modules/book/dto/top-book.dto";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import {
  DatabaseService,
  DEFAULT_PAGINATION_ITEMS_PER_PAGE,
  DEFAULT_PAGINATION_PAGE,
} from "@/shared/infra/database/database.service";
import { HardcoverBookOrderBy, HardcoverSort } from "@/shared/infra/integrations/hardcover.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import { parseIdFromSlug } from "@/shared/utils/string";
import {
  compareBy,
  getTgScoredContent,
  matchesAllTokens,
  matchesQuery,
  normalizeToken,
  paginateLocal,
  toNameList,
} from "@/shared/utils/tg-review-search";
import type { RefreshBookDto } from "../dto/refresh-book.dto";
import type { SearchBookDto } from "../dto/search-book.dto";

export interface ReviewedBookSortable {
  title: string;
  releaseDate: Date | null;
  tgReviewScore: number;
}

const BOOK_ORDER_BY_VALUE: Record<HardcoverBookOrderBy, (book: ReviewedBookSortable) => number | string | null> = {
  [HardcoverBookOrderBy.Title]: (book) => book.title.toLowerCase(),
  [HardcoverBookOrderBy.ReleaseDate]: (book) => book.releaseDate?.getTime() ?? 0,
  [HardcoverBookOrderBy.Rating]: (book) => book.tgReviewScore,
};

@Injectable()
export class BookService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async searchBooks(searchBookDto: SearchBookDto) {
    // The UI labels this filter "genres" for every content type; Hardcover calls them categories.
    const categories = searchBookDto.categories ?? searchBookDto.genres;

    if (searchBookDto.minTgScore != null) {
      return this.searchReviewedBooks({ ...searchBookDto, categories });
    }

    const hardcoverPagination = await this.integrationsService.hardcover.searchBooks({
      ...searchBookDto,
      categories,
    });

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

  /**
   * The TrackGeek rating filter can only match books we already store, so it searches our own
   * records instead of Hardcover — which keeps pagination and totals accurate.
   */
  private async searchReviewedBooks({
    page = DEFAULT_PAGINATION_PAGE,
    query,
    categories,
    year,
    status,
    orderBy = HardcoverBookOrderBy.Rating,
    sort = HardcoverSort.Desc,
    minTgScore = 0,
  }: SearchBookDto) {
    const scored = await getTgScoredContent(this.databaseService.bookReview, "bookId", minTgScore);
    const scoreById = new Map(scored.map((entry) => [entry.id, entry.tgReviewScore]));

    const books = await this.databaseService.book.findMany({
      where: { id: { in: [...scoreById.keys()] } },
      select: {
        id: true,
        hardcoverId: true,
        title: true,
        description: true,
        contributions: true,
        imageUrl: true,
        taggings: true,
        bookCategory: true,
        bookStatus: true,
        hardcoverReviewScore: true,
        releaseDate: true,
        releaseYear: true,
        lastRefreshedAt: true,
      },
    });

    const items = books
      .map((book) => {
        const tags = Array.isArray(book.taggings)
          ? (book.taggings as any[]).map((tagging) => tagging?.tag?.tag ?? tagging?.tag).filter(Boolean)
          : [];

        return {
          hardcoverId: book.hardcoverId,
          title: book.title,
          description: book.description,
          contributions: toNameList(book.contributions),
          hardcoverReviewScore: book.hardcoverReviewScore ?? 0,
          imageUrl: (book.imageUrl as { url?: string } | null)?.url ?? null,
          tags,
          category: (book.bookCategory as { name?: string } | null)?.name ?? null,
          status: (book.bookStatus as { name?: string } | null)?.name ?? null,
          releaseDate: book.releaseDate,
          releaseYear: book.releaseYear ?? book.releaseDate?.getFullYear() ?? null,
          tgReviewScore: scoreById.get(book.id) ?? 0,
          lastRefreshedAt: book.lastRefreshedAt,
        };
      })
      .filter((book) => matchesQuery(book.title, query))
      .filter((book) => matchesAllTokens([book.category, ...book.tags], categories))
      .filter((book) => !status || normalizeToken(book.status) === normalizeToken(status))
      .filter((book) => !year || String(book.releaseYear ?? "") === year);

    const sorted = compareBy(items, BOOK_ORDER_BY_VALUE[orderBy], sort);

    return paginateLocal(sorted, page, DEFAULT_PAGINATION_ITEMS_PER_PAGE);
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
