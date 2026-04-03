import { DatabaseService } from "@/shared/infra/database/database.service";
import { Injectable } from "@nestjs/common";
import { CreateOrUpdateBookProgressDto } from "../dto/create-or-update-book-progress.dto";
import { GetBookProgressDto } from "../dto/get-book-progress.dto";
import { BookProgressFindManyArgs } from "@prisma/generated/models";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { QueueService } from '@/shared/infra/queue/queue.service';
import { FeedEventType } from '@prisma/generated/enums';

@Injectable()
export class BookProgressService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
  ) {}

  async createOrUpdateBookProgress(createOrUpdateBookProgressDto: CreateOrUpdateBookProgressDto) {
    const { bookId, userId, status, readCount, chaptersRead, completedAt, startedAt } = createOrUpdateBookProgressDto;

    const bookProgress = await this.databaseService.bookProgress.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
      update: {
        status,
        chaptersRead,
        readCount,
        completedAt,
        startedAt,
      },
      create: {
        bookId,
        userId,
        status,
        readCount,
        chaptersRead,
        completedAt,
        startedAt,
      },
      include: {
        book: {
          select: {
            id: true,
            hardcoverId: true,
            imageUrl: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            profile: {
              select: {
                id: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
    
    await this.queueService.toFeedEventJob({
      type: FeedEventType.NewProgress,
      userId,
      metadata: { ...bookProgress },
    });
  }

  async deleteBookProgress(bookProgressId: string, userId: string) {
    const bookProgress = await this.databaseService.bookProgress.findUnique({
      where: { id: bookProgressId },
      select: { userId: true },
    });

    if (!bookProgress || bookProgress.userId !== userId) {
      throw new AppException(ERROR_CODES.PROGRESS_NOT_FOUND);
    }

    await this.databaseService.bookProgress.delete({
      where: { id: bookProgressId },
    });
  }

  async getBookProgress(getBookProgressDto: GetBookProgressDto) {
    const bookProgress = await this.databaseService.offsetPagination<BookProgressFindManyArgs>({
      model: "bookProgress",
      itemsPerPage: getBookProgressDto.itemsPerPage,
      page: getBookProgressDto.page,
      where: {
        ...(getBookProgressDto.bookId && { bookId: getBookProgressDto.bookId }),
        ...(getBookProgressDto.userId && { userId: getBookProgressDto.userId }),
      },
      include: {
        book: {
          select: {
            id: true,
            hardcoverId: true,
            imageUrl: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            profile: {
              select: {
                id: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return bookProgress;
  }
}
