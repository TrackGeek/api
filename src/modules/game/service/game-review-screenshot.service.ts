import { Injectable } from "@nestjs/common";
import { GameReviewScreenshotFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { CreateGameReviewScreenshotDto } from "../dto/create-game-review-screenshot.dto";
import { DeleteGameReviewScreenshotDto } from "../dto/delete-game-review-screenshot.dto";
import { GetGameReviewScreenshotsDto } from "../dto/get-game-review-screenshots.dto";

@Injectable()
export class GameReviewScreenshotService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getGameReviewScreenshots(getGameReviewScreenshotsDto: GetGameReviewScreenshotsDto) {
    const screenshots = await this.databaseService.offsetPagination<GameReviewScreenshotFindManyArgs>({
      model: "gameReviewScreenshot",
      itemsPerPage: getGameReviewScreenshotsDto.itemsPerPage,
      page: getGameReviewScreenshotsDto.page,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      where: {
        ...(getGameReviewScreenshotsDto.gameReviewId && {
          gameReviewId: getGameReviewScreenshotsDto.gameReviewId,
        }),
        ...((getGameReviewScreenshotsDto.userId || getGameReviewScreenshotsDto.gameId) && {
          gameReview: {
            ...(getGameReviewScreenshotsDto.userId && { userId: getGameReviewScreenshotsDto.userId }),
            ...(getGameReviewScreenshotsDto.gameId && { gameId: getGameReviewScreenshotsDto.gameId }),
          },
        }),
      },
      include: {
        gameReview: {
          include: {
            game: {
              select: {
                id: true,
                igdbId: true,
                coverUrl: true,
                name: true,
              },
            },
          }
        },
      },
    });

    return screenshots;
  }

  async createGameReviewScreenshot(createGameReviewScreenshotDto: CreateGameReviewScreenshotDto) {
    const gameReview = await this.databaseService.gameReview.findUnique({
      where: { id: createGameReviewScreenshotDto.gameReviewId },
    });

    if (!gameReview || gameReview.userId !== createGameReviewScreenshotDto.userId) {
      throw new AppException(ERROR_CODES.REVIEW_NOT_FOUND);
    }

    await this.databaseService.gameReviewScreenshot.create({
      data: {
        url: createGameReviewScreenshotDto.url,
        description: createGameReviewScreenshotDto.description,
        isSpoiler: createGameReviewScreenshotDto.isSpoiler,
        gameReviewId: createGameReviewScreenshotDto.gameReviewId,
      },
    });
  }

  async deleteGameReviewScreenshot(deleteGameReviewScreenshotDto: DeleteGameReviewScreenshotDto) {
    const screenshot = await this.databaseService.gameReviewScreenshot.findUnique({
      where: { id: deleteGameReviewScreenshotDto.screenshotId },
      include: {
        gameReview: {
          select: { userId: true },
        },
      },
    });

    if (!screenshot || screenshot.gameReview.userId !== deleteGameReviewScreenshotDto.userId) {
      throw new AppException(ERROR_CODES.NOT_FOUND);
    }

    await this.databaseService.gameReviewScreenshot.delete({
      where: { id: screenshot.id },
    });
  }
}
