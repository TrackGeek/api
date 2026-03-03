import { DatabaseService } from "@/shared/infra/database/database.service";
import { Injectable } from "@nestjs/common";
import { CreateOrUpdateMovieProgressDto } from "./dtos/create-or-update-movie-progress.dto";
import { AppException } from '@/shared/exceptions/app.exceptions';
import { ERROR_CODES } from '@/shared/constants/error-codes';
import { GetMovieProgressesByUserIdDto } from './dtos/get-movie-progresses-by-user-id.dto';
import { MovieProgressFindManyArgs } from '@prisma/generated/models';

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
  
  async getMovieProgressById(movieProgressId: string) {
    const movieProgress = await this.databaseService.movieProgress.findUnique({
      where: { id: movieProgressId },
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
    
    if (!movieProgress) {
      throw new AppException(ERROR_CODES.PROGRESS_NOT_FOUND);
    }

    return movieProgress;
  }
  
  async getMovieProgressesByUserId(getMovieProgressesByUserIdDto: GetMovieProgressesByUserIdDto) {
    const movieProgresses = await this.databaseService.offsetPagination<MovieProgressFindManyArgs>({
      model: "movieProgress",
      itemsPerPage: getMovieProgressesByUserIdDto.itemsPerPage,
      page: getMovieProgressesByUserIdDto.page,
      where: {
        userId: getMovieProgressesByUserIdDto.userId,
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

    return movieProgresses;
  }
}
