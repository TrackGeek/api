import { Injectable } from "@nestjs/common";
import { ProgressStatus } from "@prisma/generated/enums";
import { AnimeProgressFindManyArgs } from "@prisma/generated/models";
import { activityTypeFromProgressStatus } from "@/modules/activity/activity.utils";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { MediaFilterService } from "@/shared/media-filter/media-filter.service";
import { buildMediaWhere } from "@/shared/media-filter/media-filter.util";
import { CreateOrUpdateAnimeProgressDto } from "../dto/create-or-update-anime-progress.dto";
import { GetAnimeProgressDto } from "../dto/get-anime-progress.dto";
import { AnimeEpisodeWatchService } from "./anime-episode-watch.service";

@Injectable()
export class AnimeProgressService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
    private readonly animeEpisodeWatchService: AnimeEpisodeWatchService,
    private readonly mediaFilterService: MediaFilterService,
  ) {}

  async createOrUpdateAnimeProgress(createOrUpdateAnimeProgressDto: CreateOrUpdateAnimeProgressDto) {
    const { animeId, userId, status, watchCount, completedAt, startedAt } = createOrUpdateAnimeProgressDto;

    const animeProgress = await this.databaseService.animeProgress.upsert({
      where: {
        userId_animeId: {
          userId,
          animeId,
        },
      },
      update: {
        status,
        watchCount,
        completedAt,
        startedAt,
      },
      create: {
        animeId,
        watchCount,
        userId,
        status,
        completedAt,
        startedAt,
      },
      include: {
        anime: {
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

    const activityType = activityTypeFromProgressStatus(status);

    if (activityType) {
      await this.queueService.toActivityJob({
        type: activityType,
        userId,
        animeProgressId: animeProgress.id,
        metadata: { ...animeProgress },
      });
    }

    if (status === ProgressStatus.Completed) {
      await this.animeEpisodeWatchService.watchAllAnimeEpisodes({ animeId, userId });
    }
  }

  async deleteAnimeProgress(animeProgressId: string, userId: string) {
    const animeProgress = await this.databaseService.animeProgress.findUnique({
      where: { id: animeProgressId },
      select: { animeId: true, userId: true },
    });

    if (!animeProgress || animeProgress.userId !== userId) {
      throw new AppException(ERROR_CODES.PROGRESS_NOT_FOUND);
    }

    await this.databaseService.$transaction([
      this.databaseService.animeEpisodeWatch.deleteMany({
        where: { animeId: animeProgress.animeId, userId },
      }),
      this.databaseService.animeProgress.delete({
        where: { id: animeProgressId },
      }),
    ]);
  }

  async getAnimeProgress(getAnimeProgressDto: GetAnimeProgressDto) {
    const mediaWhere = buildMediaWhere("anime", getAnimeProgressDto);

    const where = {
      ...(getAnimeProgressDto.animeId && { animeId: getAnimeProgressDto.animeId }),
      ...(getAnimeProgressDto.userId && { userId: getAnimeProgressDto.userId }),
      ...(mediaWhere && { anime: mediaWhere }),
    };

    const [animeProgresses, statusCounts] = await Promise.all([
      this.databaseService.offsetPagination<AnimeProgressFindManyArgs>({
        model: "animeProgress",
        itemsPerPage: getAnimeProgressDto.itemsPerPage,
        page: getAnimeProgressDto.page,
        where: {
          ...where,
          ...(getAnimeProgressDto.status && { status: getAnimeProgressDto.status }),
        },
        include: {
          anime: {
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
      }),
      this.mediaFilterService.countProgressByStatus("animeProgress", where),
    ]);

    return { animeProgresses, statusCounts };
  }

  async getAnimeProgressFilters(userId: string) {
    return this.mediaFilterService.getFilterOptions("anime", userId);
  }
}
