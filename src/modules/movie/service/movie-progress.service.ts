import { DatabaseService } from "@/shared/infra/database/database.service";
import { Injectable } from "@nestjs/common";
import { CreateOrUpdateMovieProgressDto } from "../dto/create-or-update-movie-progress.dto";
import { GetMovieProgressDto } from "../dto/get-movie-progress.dto";
import { MovieProgressFindManyArgs } from "@prisma/generated/models";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";

@Injectable()
export class MovieProgressService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createOrUpdateMovieProgress(createOrUpdateMovieProgressDto: CreateOrUpdateMovieProgressDto) {
    const { movieId, userId, status } = createOrUpdateMovieProgressDto;

    await this.databaseService.movieProgress.upsert({
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
    });
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
        movie: true,
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
