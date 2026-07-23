import { Injectable } from "@nestjs/common";
import { MovieProgressFindManyArgs } from "@prisma/generated/models";
import { activityTypeFromProgressStatus } from "@/modules/activity/activity.utils";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { CreateOrUpdateMovieProgressDto } from "../dto/create-or-update-movie-progress.dto";
import { GetMovieProgressDto } from "../dto/get-movie-progress.dto";

@Injectable()
export class MovieProgressService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
  ) {}

  async createOrUpdateMovieProgress(createOrUpdateMovieProgressDto: CreateOrUpdateMovieProgressDto) {
    const { movieId, userId, status } = createOrUpdateMovieProgressDto;

    const movieProgress = await this.databaseService.movieProgress.upsert({
      where: {
        userId_movieId: {
          userId,
          movieId,
        },
      },
      update: {
        status,
      },
      create: {
        movieId,
        userId,
        status,
      },
      include: {
        movie: {
          select: {
            id: true,
            imdbId: true,
            tmdbId: true,
            posterUrl: true,
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
        movieProgressId: movieProgress.id,
        metadata: { ...movieProgress },
      });
    }
  }

  async deleteMovieProgress(movieProgressId: string, userId: string) {
    const movieProgress = await this.databaseService.movieProgress.findUnique({
      where: { id: movieProgressId },
      select: { userId: true },
    });

    if (!movieProgress || movieProgress.userId !== userId) {
      throw new AppException(ERROR_CODES.PROGRESS_NOT_FOUND);
    }

    await this.databaseService.movieProgress.delete({
      where: { id: movieProgressId },
    });
  }

  async getMovieProgress(getMovieProgressDto: GetMovieProgressDto) {
    const movieProgress = await this.databaseService.offsetPagination<MovieProgressFindManyArgs>({
      model: "movieProgress",
      itemsPerPage: getMovieProgressDto.itemsPerPage,
      page: getMovieProgressDto.page,
      where: {
        ...(getMovieProgressDto.userId && { userId: getMovieProgressDto.userId }),
        ...(getMovieProgressDto.movieId && { movieId: getMovieProgressDto.movieId }),
      },
      include: {
        movie: {
          select: {
            id: true,
            imdbId: true,
            tmdbId: true,
            posterUrl: true,
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

    return movieProgress;
  }
}
