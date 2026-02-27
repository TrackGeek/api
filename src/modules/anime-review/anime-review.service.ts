import { Injectable } from "@nestjs/common";
import { FeedEventType } from "@prisma/generated/enums";
import { AnimeReviewFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { CreateAnimeReviewDto } from "./dtos/create-anime-review.dto";
import { DeleteAnimeReviewDto } from "./dtos/delete-anime-review.dto";
import { GetAnimeReviewsDto } from "./dtos/get-anime-reviews.dto";
import { UpdateAnimeReviewDto } from "./dtos/update-anime-review.dto";

@Injectable()
export class AnimeReviewService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
  ) {}

  async createAnimeReview(createAnimeReviewDto: CreateAnimeReviewDto) {
    const animeReview = await this.databaseService.animeReview.create({
      data: {
        overall: createAnimeReviewDto.overall,
        story: createAnimeReviewDto.story,
        characters: createAnimeReviewDto.characters,
        animation: createAnimeReviewDto.animation,
        sound: createAnimeReviewDto.sound,
        enjoyment: createAnimeReviewDto.enjoyment,
        summary: createAnimeReviewDto.summary,
        pros: createAnimeReviewDto.pros,
        cons: createAnimeReviewDto.cons,
        notes: createAnimeReviewDto.notes,
        recommended: createAnimeReviewDto.recommended,
        animeId: createAnimeReviewDto.animeId,
        userId: createAnimeReviewDto.userId,
      },
      include: {
        anime: true,
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

    await this.queueService.toFeedEventQueue({
      type: FeedEventType.NewReview,
      userId: createAnimeReviewDto.userId,
      metadata: { animeReview },
    });
  }

  async getAnimeReviewById(animeReviewId: string) {
    const animeReview = await this.databaseService.animeReview.findUnique({
      where: { id: animeReviewId },
      include: {
        anime: true,
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

    if (!animeReview) {
      throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
    }

    return animeReview;
  }

  async getAnimeReviews(getAnimeReviewsDto: GetAnimeReviewsDto) {
    const animeReviews = await this.databaseService.offsetPagination<AnimeReviewFindManyArgs>({
      model: "animeReview",
      itemsPerPage: getAnimeReviewsDto.itemsPerPage,
      page: getAnimeReviewsDto.page,
      where: {
        animeId: getAnimeReviewsDto.animeId,
        userId: getAnimeReviewsDto.userId,
      },
      include: {
        anime: true,
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

    return animeReviews;
  }

  async updateAnimeReview(updateAnimeReviewDto: UpdateAnimeReviewDto) {
    const animeReview = await this.databaseService.animeReview.findUnique({
      where: {
        id: updateAnimeReviewDto.animeReviewId,
      },
    });

    if (!animeReview || animeReview.userId !== updateAnimeReviewDto.userId) {
      throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
    }

    await this.databaseService.animeReview.update({
      where: {
        id: animeReview.id,
      },
      data: {
        overall: updateAnimeReviewDto.overall,
        story: updateAnimeReviewDto.story,
        characters: updateAnimeReviewDto.characters,
        animation: updateAnimeReviewDto.animation,
        sound: updateAnimeReviewDto.sound,
        enjoyment: updateAnimeReviewDto.enjoyment,
        summary: updateAnimeReviewDto.summary,
        pros: updateAnimeReviewDto.pros,
        cons: updateAnimeReviewDto.cons,
        notes: updateAnimeReviewDto.notes,
        recommended: updateAnimeReviewDto.recommended,
      },
    });
  }

  async deleteAnimeReview(deleteAnimeReviewDto: DeleteAnimeReviewDto) {
    const animeReview = await this.databaseService.animeReview.findUnique({
      where: {
        id: deleteAnimeReviewDto.animeReviewId,
      },
    });

    if (!animeReview || animeReview.userId !== deleteAnimeReviewDto.userId) {
      throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
    }

    await this.databaseService.animeReview.delete({
      where: { id: animeReview.id },
    });
  }
}
