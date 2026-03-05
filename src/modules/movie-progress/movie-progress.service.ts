import { DatabaseService } from "@/shared/infra/database/database.service";
import { Injectable } from "@nestjs/common";
import { CreateOrUpdateMovieProgressDto } from "./dtos/create-or-update-movie-progress.dto";
import { GetMovieProgressDto } from "./dtos/get-movie-progress.dto";
import { MovieProgressFindManyArgs } from "@prisma/generated/models";

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

  async getMovieProgress(getMovieProgressDto: GetMovieProgressDto) {
    const movieProgress = await this.databaseService.offsetPagination<MovieProgressFindManyArgs>({
      model: "movieProgress",
      itemsPerPage: getMovieProgressDto.itemsPerPage,
      page: getMovieProgressDto.page,
      where: {
        userId: getMovieProgressDto.userId,
        movieId: getMovieProgressDto.movieId,
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
