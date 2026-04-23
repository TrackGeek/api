import { Injectable } from "@nestjs/common";
import { FeedEventType } from "@prisma/generated/enums";
import { MovieReviewFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { CreateMovieReviewDto } from "../dto/create-movie-review.dto";
import { DeleteMovieReviewDto } from "../dto/delete-movie-review.dto";
import { GetMovieReviewsDto } from "../dto/get-movie-reviews.dto";
import { UpdateMovieReviewDto } from "../dto/update-movie-review.dto";

@Injectable()
export class MovieReviewService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
  ) {}

  async createMovieReview(createMovieReviewDto: CreateMovieReviewDto) {
    const movieReview = await this.databaseService.movieReview.create({
      data: {
        overall: createMovieReviewDto.overall,
        direction: createMovieReviewDto.direction,
        production: createMovieReviewDto.production,
        acting: createMovieReviewDto.acting,
        summary: createMovieReviewDto.summary,
        notes: createMovieReviewDto.notes,
        story: createMovieReviewDto.story,
        recommended: createMovieReviewDto.recommended,
        movieId: createMovieReviewDto.movieId,
        userId: createMovieReviewDto.userId,
      },
      include: {
        movie: {
          select: {
            id: true,
            imdbId: true,
            tmdbId: true,
            backdropUrl: true,
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
      type: FeedEventType.NewReview,
      userId: createMovieReviewDto.userId,
      metadata: { ...movieReview },
    });
  }

  async getMovieReviewById(movieReviewId: string) {
    const movieReview = await this.databaseService.movieReview.findUnique({
      where: { id: movieReviewId },
      include: {
        movie: {
          select: {
            id: true,
            imdbId: true,
            tmdbId: true,
            backdropUrl: true,
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

    if (!movieReview) {
      throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
    }

    return movieReview;
  }

  async getMovieReviews(getMovieReviewsDto: GetMovieReviewsDto) {
    const movieReviews = await this.databaseService.offsetPagination<MovieReviewFindManyArgs>({
      model: "movieReview",
      itemsPerPage: getMovieReviewsDto.itemsPerPage,
      page: getMovieReviewsDto.page,
      where: {
        ...(getMovieReviewsDto.userId && { userId: getMovieReviewsDto.userId }),
        ...(getMovieReviewsDto.movieId && { movieId: getMovieReviewsDto.movieId }),
      },
      include: {
        movie: {
          select: {
            id: true,
            imdbId: true,
            tmdbId: true,
            backdropUrl: true,
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

    return movieReviews;
  }

  async updateMovieReview(updateMovieReviewDto: UpdateMovieReviewDto) {
    const movieReview = await this.databaseService.movieReview.findUnique({
      where: {
        id: updateMovieReviewDto.movieReviewId,
      },
    });

    if (!movieReview || movieReview.userId !== updateMovieReviewDto.userId) {
      throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
    }

    await this.databaseService.movieReview.update({
      where: { id: movieReview.id },
      data: {
        overall: updateMovieReviewDto.overall,
        direction: updateMovieReviewDto.direction,
        production: updateMovieReviewDto.production,
        acting: updateMovieReviewDto.acting,
        summary: updateMovieReviewDto.summary,
        notes: updateMovieReviewDto.notes,
        story: updateMovieReviewDto.story,
        recommended: updateMovieReviewDto.recommended,
      },
    });
  }

  async deleteMovieReview(deleteMovieReviewDto: DeleteMovieReviewDto) {
    const movieReview = await this.databaseService.movieReview.findUnique({
      where: {
        id: deleteMovieReviewDto.movieReviewId,
      },
    });

    if (!movieReview || movieReview.userId !== deleteMovieReviewDto.userId) {
      throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
    }

    await this.databaseService.movieReview.delete({
      where: { id: movieReview.id },
    });
  }
}
