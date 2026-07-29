import { Injectable } from "@nestjs/common";
import { GameScreenshotFindManyArgs } from "@prisma/generated/models";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { CreateGameScreenshotDto } from "../dto/create-game-screenshot.dto";
import { DeleteGameScreenshotDto } from "../dto/delete-game-screenshot.dto";
import { GetGameScreenshotsDto } from "../dto/get-game-screenshots.dto";
import { UpdateGameScreenshotDto } from "../dto/update-game-screenshot.dto";

const GAME_SELECT = {
  id: true,
  igdbId: true,
  coverUrl: true,
  name: true,
};

@Injectable()
export class GameScreenshotService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getGameScreenshots(getGameScreenshotsDto: GetGameScreenshotsDto) {
    const screenshots = await this.databaseService.offsetPagination<GameScreenshotFindManyArgs>({
      model: "gameScreenshot",
      itemsPerPage: getGameScreenshotsDto.itemsPerPage,
      page: getGameScreenshotsDto.page,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      where: {
        ...(getGameScreenshotsDto.userId && { userId: getGameScreenshotsDto.userId }),
        ...(getGameScreenshotsDto.gameId && { gameId: getGameScreenshotsDto.gameId }),
      },
      include: {
        game: { select: GAME_SELECT },
      },
    });

    return screenshots;
  }

  async createGameScreenshot(createGameScreenshotDto: CreateGameScreenshotDto) {
    const game = await this.databaseService.game.findUnique({
      where: { id: createGameScreenshotDto.gameId },
      select: { id: true },
    });

    if (!game) {
      throw new AppException(ERROR_CODES.GAME_NOT_FOUND);
    }

    return this.databaseService.gameScreenshot.create({
      data: {
        url: createGameScreenshotDto.url,
        description: createGameScreenshotDto.description,
        isSpoiler: createGameScreenshotDto.isSpoiler ?? false,
        userId: createGameScreenshotDto.userId,
        gameId: game.id,
      },
      include: {
        game: { select: GAME_SELECT },
      },
    });
  }

  async updateGameScreenshot(updateGameScreenshotDto: UpdateGameScreenshotDto) {
    const screenshot = await this.findOwnedScreenshot(
      updateGameScreenshotDto.screenshotId,
      updateGameScreenshotDto.userId,
    );

    return this.databaseService.gameScreenshot.update({
      where: { id: screenshot.id },
      data: {
        ...(updateGameScreenshotDto.description !== undefined && {
          description: updateGameScreenshotDto.description || null,
        }),
        ...(updateGameScreenshotDto.isSpoiler !== undefined && { isSpoiler: updateGameScreenshotDto.isSpoiler }),
      },
      include: {
        game: { select: GAME_SELECT },
      },
    });
  }

  async deleteGameScreenshot(deleteGameScreenshotDto: DeleteGameScreenshotDto) {
    const screenshot = await this.findOwnedScreenshot(
      deleteGameScreenshotDto.screenshotId,
      deleteGameScreenshotDto.userId,
    );

    await this.databaseService.gameScreenshot.delete({
      where: { id: screenshot.id },
    });
  }

  private async findOwnedScreenshot(screenshotId: string, userId: string) {
    const screenshot = await this.databaseService.gameScreenshot.findUnique({
      where: { id: screenshotId },
      select: { id: true, userId: true },
    });

    if (!screenshot || screenshot.userId !== userId) {
      throw new AppException(ERROR_CODES.NOT_FOUND);
    }

    return screenshot;
  }
}
