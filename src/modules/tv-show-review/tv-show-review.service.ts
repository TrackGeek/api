import { Injectable } from "@nestjs/common";
import { FeedEventType } from "@prisma/generated/enums";
import { TvShowReviewFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { CreateTVShowReviewDto } from "./dtos/create-tv-show-review.dto";
import { DeleteTVShowReviewDto } from "./dtos/delete-tv-show-review.dto";
import { GetTVShowReviewsDto } from "./dtos/get-tv-show-reviews.dto";
import { UpdateTVShowReviewDto } from "./dtos/update-tv-show-review.dto";

@Injectable()
export class TVShowReviewService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
  ) {}

  async createTVShowReview(createTVShowReviewDto: CreateTVShowReviewDto) {
    const tvShowReview = await this.databaseService.tvShowReview.create({
      data: {
        overall: createTVShowReviewDto.overall,
        direction: createTVShowReviewDto.direction,
        production: createTVShowReviewDto.production,
        acting: createTVShowReviewDto.acting,
        summary: createTVShowReviewDto.summary,
        notes: createTVShowReviewDto.notes,
        story: createTVShowReviewDto.story,
        recommended: createTVShowReviewDto.recommended,
        tvShowId: createTVShowReviewDto.tvShowId,
        userId: createTVShowReviewDto.userId,
      },
      include: {
        tvShow: {
          omit: {
            seasons: true,
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
      userId: createTVShowReviewDto.userId,
      metadata: { ...tvShowReview },
    });
  }

  async getTVShowReviewById(tvShowReviewId: string) {
    const tvShowReview = await this.databaseService.tvShowReview.findUnique({
      where: { id: tvShowReviewId },
      include: {
        tvShow: {
          omit: {
            seasons: true,
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

    if (!tvShowReview) {
      throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
    }

    return tvShowReview;
  }

  async getTVShowReviews(getTVShowReviewsDto: GetTVShowReviewsDto) {
    const tvShowReviews = await this.databaseService.offsetPagination<TvShowReviewFindManyArgs>({
      model: "tvShowReview",
      itemsPerPage: getTVShowReviewsDto.itemsPerPage,
      page: getTVShowReviewsDto.page,
      where: {
        tvShowId: getTVShowReviewsDto.tvShowId,
        userId: getTVShowReviewsDto.userId,
      },
      include: {
        tvShow: {
          omit: {
            seasons: true,
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

    return tvShowReviews;
  }

  async updateTVShowReview(updateTVShowReviewDto: UpdateTVShowReviewDto) {
    const tvShowReview = await this.databaseService.tvShowReview.findUnique({
      where: {
        id: updateTVShowReviewDto.tvShowReviewId,
      },
    });

    if (!tvShowReview || tvShowReview.userId !== updateTVShowReviewDto.userId) {
      throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
    }

    await this.databaseService.tvShowReview.update({
      where: { id: tvShowReview.id },
      data: {
        overall: updateTVShowReviewDto.overall,
        direction: updateTVShowReviewDto.direction,
        production: updateTVShowReviewDto.production,
        acting: updateTVShowReviewDto.acting,
        summary: updateTVShowReviewDto.summary,
        notes: updateTVShowReviewDto.notes,
        story: updateTVShowReviewDto.story,
        recommended: updateTVShowReviewDto.recommended,
      },
    });
  }

  async deleteTVShowReview(deleteTVShowReviewDto: DeleteTVShowReviewDto) {
    const tvShowReview = await this.databaseService.tvShowReview.findUnique({
      where: {
        id: deleteTVShowReviewDto.tvShowReviewId,
      },
    });

    if (!tvShowReview || tvShowReview.userId !== deleteTVShowReviewDto.userId) {
      throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
    }

    await this.databaseService.tvShowReview.delete({
      where: { id: tvShowReview.id },
    });
  }
}
