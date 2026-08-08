import { Injectable } from "@nestjs/common";
import { MangaProgressFindManyArgs } from "@prisma/generated/models";
import { activityTypeFromProgressStatus } from "@/modules/activity/activity.utils";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { MediaFilterService } from "@/shared/media-filter/media-filter.service";
import { buildMediaWhere, buildProgressOrderBy } from "@/shared/media-filter/media-filter.util";
import { CreateOrUpdateMangaProgressDto } from "../dto/create-or-update-manga-progress.dto";
import { GetMangaProgressDto } from "../dto/get-manga-progressesdto";

@Injectable()
export class MangaProgressService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
    private readonly mediaFilterService: MediaFilterService,
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
            anilistId: true,
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

    const activityType = activityTypeFromProgressStatus(status);

    if (activityType) {
      await this.queueService.toActivityJob({
        type: activityType,
        userId,
        mangaProgressId: mangaProgress.id,
        metadata: { ...mangaProgress },
      });
    }
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
    const mediaWhere = buildMediaWhere("manga", getMangaProgressDto);

    const where = {
      ...(getMangaProgressDto.mangaId && { mangaId: getMangaProgressDto.mangaId }),
      ...(getMangaProgressDto.userId && { userId: getMangaProgressDto.userId }),
      ...(mediaWhere && { manga: mediaWhere }),
    };

    const [mangaProgresses, statusCounts] = await Promise.all([
      this.databaseService.offsetPagination<MangaProgressFindManyArgs>({
        model: "mangaProgress",
        itemsPerPage: getMangaProgressDto.itemsPerPage,
        page: getMangaProgressDto.page,
        where: {
          ...where,
          ...(getMangaProgressDto.status && { status: getMangaProgressDto.status }),
        },
        orderBy: buildProgressOrderBy("manga", getMangaProgressDto),
        include: {
          manga: {
            select: {
              id: true,
              anilistId: true,
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
      }),
      this.mediaFilterService.countProgressByStatus("mangaProgress", where),
    ]);

    return { mangaProgresses, statusCounts };
  }

  async getMangaProgressFilters(userId: string) {
    return this.mediaFilterService.getFilterOptions("manga", userId);
  }
}
