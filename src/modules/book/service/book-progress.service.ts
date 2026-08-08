import { Injectable } from "@nestjs/common";
import { BookProgressFindManyArgs } from "@prisma/generated/models";
import { activityTypeFromProgressStatus } from "@/modules/activity/activity.utils";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { MediaFilterService } from "@/shared/media-filter/media-filter.service";
import { buildMediaWhere, buildProgressOrderBy } from "@/shared/media-filter/media-filter.util";
import { CreateOrUpdateBookProgressDto } from "../dto/create-or-update-book-progress.dto";
import { GetBookProgressDto } from "../dto/get-book-progress.dto";

@Injectable()
export class BookProgressService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
    private readonly mediaFilterService: MediaFilterService,
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

    const activityType = activityTypeFromProgressStatus(status);

    if (activityType) {
      await this.queueService.toActivityJob({
        type: activityType,
        userId,
        bookProgressId: bookProgress.id,
        metadata: { ...bookProgress },
      });
    }
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
    const mediaWhere = buildMediaWhere("book", getBookProgressDto);

    const where = {
      ...(getBookProgressDto.bookId && { bookId: getBookProgressDto.bookId }),
      ...(getBookProgressDto.userId && { userId: getBookProgressDto.userId }),
      ...(mediaWhere && { book: mediaWhere }),
    };

    const [bookProgresses, statusCounts] = await Promise.all([
      this.databaseService.offsetPagination<BookProgressFindManyArgs>({
        model: "bookProgress",
        itemsPerPage: getBookProgressDto.itemsPerPage,
        page: getBookProgressDto.page,
        where: {
          ...where,
          ...(getBookProgressDto.status && { status: getBookProgressDto.status }),
        },
        orderBy: buildProgressOrderBy("book", getBookProgressDto),
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
      }),
      this.mediaFilterService.countProgressByStatus("bookProgress", where),
    ]);

    return { bookProgresses, statusCounts };
  }

  async getBookProgressFilters(userId: string) {
    return this.mediaFilterService.getFilterOptions("book", userId);
  }
}
