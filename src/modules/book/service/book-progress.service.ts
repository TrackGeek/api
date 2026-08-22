import { Injectable } from "@nestjs/common";
import { ContentType } from "@prisma/generated/enums";
import { BookProgressFindManyArgs } from "@prisma/generated/models";
import { activityTypeFromProgressStatus, xpReasonFromProgressStatus } from "@/modules/activity/activity.utils";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { XP_SOURCE_KEYS } from "@/shared/constants/xp";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { MediaFilterService } from "@/shared/media-filter/media-filter.service";
import { buildMediaWhere, buildProgressOrderBy } from "@/shared/media-filter/media-filter.util";
import { MediaReleaseService } from "@/shared/media-release/media-release.service";
import { CreateOrUpdateBookProgressDto } from "../dto/create-or-update-book-progress.dto";
import { GetBookProgressDto } from "../dto/get-book-progress.dto";

@Injectable()
export class BookProgressService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
    private readonly mediaFilterService: MediaFilterService,
    private readonly mediaReleaseService: MediaReleaseService,
  ) {}

  async createOrUpdateBookProgress(createOrUpdateBookProgressDto: CreateOrUpdateBookProgressDto) {
    const { bookId, userId, status, readCount, chaptersRead, completedAt, startedAt } = createOrUpdateBookProgressDto;

    await this.mediaReleaseService.assertProgressStatusAllowed("book", bookId, status);

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

    const xpReason = xpReasonFromProgressStatus(status);

    if (xpReason) {
      await this.queueService.toXpJob({
        userId,
        reason: xpReason,
        contentType: ContentType.Book,
        sourceKey: XP_SOURCE_KEYS.progress(xpReason, ContentType.Book, bookId),
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
