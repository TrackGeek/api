import { Injectable } from "@nestjs/common";
import { FeedEventType } from "@prisma/generated/enums";
import { MangaProgressFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { CreateOrUpdateMangaProgressDto } from "../dto/create-or-update-manga-progress.dto";
import { GetMangaProgressDto } from "../dto/get-manga-progressesdto";

@Injectable()
export class MangaProgressService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
  ) {}

  async createOrUpdateMangaProgress(createOrUpdateMangaProgressDto: CreateOrUpdateMangaProgressDto) {
    const { mangaId, userId, status, chaptersRead, readCount, completedAt, startedAt } = createOrUpdateMangaProgressDto;

    const manga = await this.databaseService.manga.findUnique({
      where: { id: mangaId },
    });

    if (!manga) {
      throw new AppException(ERROR_CODES.MANGA_NOT_FOUND);
    }

    if (chaptersRead && manga.numberOfChapters && chaptersRead > manga.numberOfChapters) {
      throw new AppException(ERROR_CODES.INVALID_CHAPTERS_READ);
    }

    const mangaProgress = await this.databaseService.mangaProgress.upsert({
      where: {
        userId_mangaId: {
          userId,
          mangaId,
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
        mangaId,
        userId,
        readCount,
        status,
        chaptersRead,
        completedAt,
        startedAt,
      },
      include: {
        manga: {
          select: {
            id: true,
            malId: true,
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
      metadata: { ...mangaProgress },
    });
  }

  async deleteMangaProgress(mangaProgressId: string, userId: string) {
    const mangaProgress = await this.databaseService.mangaProgress.findUnique({
      where: { id: mangaProgressId },
      select: { userId: true },
    });

    if (!mangaProgress || mangaProgress.userId !== userId) {
      throw new AppException(ERROR_CODES.PROGRESS_NOT_FOUND);
    }

    await this.databaseService.mangaProgress.delete({
      where: { id: mangaProgressId },
    });
  }

  async getMangaProgress(getMangaProgressDto: GetMangaProgressDto) {
    const mangaProgress = await this.databaseService.offsetPagination<MangaProgressFindManyArgs>({
      model: "mangaProgress",
      itemsPerPage: getMangaProgressDto.itemsPerPage,
      page: getMangaProgressDto.page,
      where: {
        ...(getMangaProgressDto.mangaId && { mangaId: getMangaProgressDto.mangaId }),
        ...(getMangaProgressDto.userId && { userId: getMangaProgressDto.userId }),
      },
      include: {
        manga: {
          select: {
            id: true,
            malId: true,
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

    return mangaProgress;
  }
}
