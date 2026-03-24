import { DatabaseService } from "@/shared/infra/database/database.service";
import { Injectable } from "@nestjs/common";
import { CreateOrUpdateGameProgressDto } from "../dto/create-or-update-game-progress.dto";
import { GetGameProgressDto } from "../dto/get-game-progress.dto";
import { GameProgressFindManyArgs } from "@prisma/generated/models";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";

@Injectable()
export class GameProgressService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createOrUpdateGameProgress(createOrUpdateGameProgressDto: CreateOrUpdateGameProgressDto) {
    const { gameId, userId, status, playCount, completedAt, startedAt } = createOrUpdateGameProgressDto;

    await this.databaseService.gameProgress.upsert({
      where: {
        userId_gameId: {
          userId,
          gameId,
        },
      },
      update: {
        status,
        playCount,
        completedAt,
        startedAt,
      },
      create: {
        gameId,
        userId,
        playCount,
        status,
        completedAt,
        startedAt,
      },
    });
  }

  async deleteGameProgress(gameProgressId: string, userId: string) {
    const gameProgress = await this.databaseService.gameProgress.findUnique({
      where: { id: gameProgressId },
      select: { userId: true },
    });

    if (!gameProgress || gameProgress.userId !== userId) {
      throw new AppException(ERROR_CODES.PROGRESS_NOT_FOUND);
    }

    await this.databaseService.gameProgress.delete({
      where: { id: gameProgressId },
    });
  }

  async getGameProgress(getGameProgressDto: GetGameProgressDto) {
    const gameProgress = await this.databaseService.offsetPagination<GameProgressFindManyArgs>({
      model: "gameProgress",
      itemsPerPage: getGameProgressDto.itemsPerPage,
      page: getGameProgressDto.page,
      where: {
        ...(getGameProgressDto.gameId && { gameId: getGameProgressDto.gameId }),
        ...(getGameProgressDto.userId && { userId: getGameProgressDto.userId }),
      },
      include: {
        game: true,
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

    return gameProgress;
  }
}
