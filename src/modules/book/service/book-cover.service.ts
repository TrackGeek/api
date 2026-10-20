import { Injectable, Logger } from "@nestjs/common";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { HardcoverService } from "@/shared/infra/integrations/hardcover.service";

export interface BookCover {
  editionId: number;
  imageUrl: string;
  custom: boolean;
}

@Injectable()
export class BookCoverService {
  private readonly logger = new Logger(BookCoverService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly hardcoverService: HardcoverService,
  ) {}

  async setCover(userId: string, hardcoverId: number, editionId: number) {
    const book = await this.databaseService.book.findUnique({ where: { hardcoverId }, select: { id: true } });
    if (!book) throw new AppException(ERROR_CODES.BOOK_NOT_FOUND);
    const imageUrl = await this.hardcoverService.getBookEditionCover(hardcoverId, editionId);
    if (!imageUrl) throw new AppException(ERROR_CODES.INVALID_BOOK_COVER);
    await this.databaseService.bookCoverPreference.upsert({
      where: { userId_bookId: { userId, bookId: book.id } },
      create: { userId, bookId: book.id, editionId, imageUrl },
      update: { editionId, imageUrl },
    });
    return { editionId, imageUrl };
  }

  async resetCover(userId: string, hardcoverId: number) {
    await this.databaseService.bookCoverPreference.deleteMany({ where: { userId, book: { hardcoverId } } });
  }

  async resolveCovers(hardcoverIds: number[], locale: string, userId?: string) {
    const ids = [...new Set(hardcoverIds)];
    const covers = new Map<number, BookCover>();
    if (userId) {
      const preferences = await this.databaseService.bookCoverPreference.findMany({
        where: { userId, book: { hardcoverId: { in: ids } } },
        select: { editionId: true, imageUrl: true, book: { select: { hardcoverId: true } } },
      });
      for (const preference of preferences) {
        covers.set(preference.book.hardcoverId, {
          editionId: preference.editionId,
          imageUrl: preference.imageUrl,
          custom: true,
        });
      }
    }
    const missing = ids.filter((id) => !covers.has(id));
    const language = locale.split(/[-_]/)[0].toLowerCase();
    if (!missing.length || !/^[a-z]{2,3}$/.test(language)) return covers;
    try {
      const localized = await this.hardcoverService.getLocalizedBookCovers(missing, language);
      for (const [id, cover] of localized) {
        if (cover) covers.set(id, { ...cover, custom: false });
      }
    } catch (error) {
      this.logger.warn("Could not resolve localized book covers", error);
    }
    return covers;
  }
}
