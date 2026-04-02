import { Injectable } from "@nestjs/common";
import { FeedEventType } from "@prisma/generated/enums";
import { GameReviewFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { CreateGameReviewDto } from "../dto/create-game-review.dto";
import { DeleteGameReviewDto } from "../dto/delete-game-review.dto";
import { GetGameReviewsDto } from "../dto/get-game-reviews.dto";
import { UpdateGameReviewDto } from "../dto/update-game-review.dto";

@Injectable()
export class GameReviewService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
  ) {}

  async createGameReview(createGameReviewDto: CreateGameReviewDto) {
    const gameReview = await this.databaseService.gameReview.create({
      data: {
        overall: createGameReviewDto.overall,
        graphics: createGameReviewDto.graphics,
        sound: createGameReviewDto.sound,
        story: createGameReviewDto.story,
        gameplay: createGameReviewDto.gameplay,
        platform: createGameReviewDto.platform,
        summary: createGameReviewDto.summary,
        notes: createGameReviewDto.notes,
        recommended: createGameReviewDto.recommended,
        gameId: createGameReviewDto.gameId,
        userId: createGameReviewDto.userId,
      },
      include: {
        game: {
          select: {
            id: true,
            igdbId: true,
            coverUrl: true,
            name: true,
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
      userId: createGameReviewDto.userId,
      metadata: { ...gameReview },
    });
  }

  async getGameReviewById(gameReviewId: string) {
    const gameReview = await this.databaseService.gameReview.findUnique({
      where: { id: gameReviewId },
      include: {
        game: {
          select: {
            id: true,
            igdbId: true,
            coverUrl: true,
            name: true,
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

    if (!gameReview) {
      throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
    }

    return gameReview;
  }

  async getGameReviews(getGameReviewsDto: GetGameReviewsDto) {
    const gameReviews = await this.databaseService.offsetPagination<GameReviewFindManyArgs>({
      model: "gameReview",
      itemsPerPage: getGameReviewsDto.itemsPerPage,
      page: getGameReviewsDto.page,
      where: {
        ...(getGameReviewsDto.gameId && { gameId: getGameReviewsDto.gameId }),
        ...(getGameReviewsDto.userId && { userId: getGameReviewsDto.userId }),
      },
      include: {
        game: {
          select: {
            id: true,
            igdbId: true,
            coverUrl: true,
            name: true,
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

    return gameReviews;
  }

  async updateGameReview(updateGameReviewDto: UpdateGameReviewDto) {
    const gameReview = await this.databaseService.gameReview.findUnique({
      where: {
        id: updateGameReviewDto.gameReviewId,
      },
    });

    if (!gameReview || gameReview.userId !== updateGameReviewDto.userId) {
      throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
    }

    await this.databaseService.gameReview.update({
      where: {
        id: gameReview.id,
      },
      data: {
        overall: updateGameReviewDto.overall,
        graphics: updateGameReviewDto.graphics,
        sound: updateGameReviewDto.sound,
        story: updateGameReviewDto.story,
        gameplay: updateGameReviewDto.gameplay,
        platform: updateGameReviewDto.platform,
        summary: updateGameReviewDto.summary,
        notes: updateGameReviewDto.notes,
        recommended: updateGameReviewDto.recommended,
      },
    });
  }

  async deleteGameReview(deleteGameReviewDto: DeleteGameReviewDto) {
    const gameReview = await this.databaseService.gameReview.findUnique({
      where: {
        id: deleteGameReviewDto.gameReviewId,
      },
    });

    if (!gameReview || gameReview.userId !== deleteGameReviewDto.userId) {
      throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
    }

    await this.databaseService.gameReview.delete({
      where: { id: gameReview.id },
    });
  }
}
