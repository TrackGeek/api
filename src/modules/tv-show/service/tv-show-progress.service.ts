import { DatabaseService } from "@/shared/infra/database/database.service";
import { Injectable } from "@nestjs/common";
import { CreateOrUpdateTVShowProgressDto } from "../dto/create-or-update-tv-show-progress.dto";
import { GetTVShowProgressDto } from "../dto/get-tv-show-progress.dto";
import { TvShowProgressFindManyArgs } from "@prisma/generated/models";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { TVShowEpisodeWatchService } from "./tv-show-episode-watch.service";
import { FeedEventType, ProgressStatus } from "@prisma/generated/enums";
import { QueueService } from '@/shared/infra/queue/queue.service';

@Injectable()
export class TVShowProgressService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
    private readonly tvShowEpisodeWatchService: TVShowEpisodeWatchService,
  ) {}

  async createOrUpdateTVShowProgress(createOrUpdateTVShowProgressDto: CreateOrUpdateTVShowProgressDto) {
    const { tvShowId, userId, status, watchCount, completedAt, startedAt } = createOrUpdateTVShowProgressDto;

    const tvShowProgress = await this.databaseService.tvShowProgress.upsert({
      where: {
        userId_tvShowId: {
          userId,
          tvShowId,
        },
      },
      update: {
        status,
        watchCount,
        completedAt,
        startedAt,
      },
      create: {
        tvShowId,
        userId,
        status,
        watchCount,
        completedAt,
        startedAt,
      },
      include: {
        tvShow: {
          select: {
            id: true,
            tmdbId: true,
            backdropUrl: true,
            name: true,
          }
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
      type: FeedEventType.NewReview,
      userId,
      metadata: { ...tvShowProgress },
    });

    if (status === ProgressStatus.Completed) {
      await this.tvShowEpisodeWatchService.watchAllEpisodesOfTVShow({ tvShowId, userId });
    }
  }

  async deleteTVShowProgress(tvShowProgressId: string, userId: string) {
    const tvShowProgress = await this.databaseService.tvShowProgress.findUnique({
      where: { id: tvShowProgressId },
      select: { tvShowId: true, userId: true },
    });

    if (!tvShowProgress || tvShowProgress.userId !== userId) {
      throw new AppException(ERROR_CODES.PROGRESS_NOT_FOUND);
    }

    await this.databaseService.$transaction([
      this.databaseService.tvShowEpisodeWatch.deleteMany({
        where: { tvShowId: tvShowProgress.tvShowId, userId },
      }),
      this.databaseService.tvShowProgress.delete({
        where: { id: tvShowProgressId },
      }),
    ]);
  }

  async getTVShowProgress(getTVShowProgressDto: GetTVShowProgressDto) {
    const tvShowProgress = await this.databaseService.offsetPagination<TvShowProgressFindManyArgs>({
      model: "tvShowProgress",
      itemsPerPage: getTVShowProgressDto.itemsPerPage,
      page: getTVShowProgressDto.page,
      where: {
        ...(getTVShowProgressDto.userId && { userId: getTVShowProgressDto.userId }),
        ...(getTVShowProgressDto.tvShowId && { tvShowId: getTVShowProgressDto.tvShowId }),
      },
      include: {
        tvShow: {
          select: {
            id: true,
            tmdbId: true,
            backdropUrl: true,
            name: true,
          }
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

    return tvShowProgress;
  }
}
