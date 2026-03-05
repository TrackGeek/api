import { DatabaseService } from "@/shared/infra/database/database.service";
import { Injectable } from "@nestjs/common";
import { CreateOrUpdateGameProgressDto } from "./dtos/create-or-update-game-progress.dto";
import { GetGameProgressDto } from './dtos/get-game-progress.dto';
import { GameProgressFindManyArgs } from '@prisma/generated/models';

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
        startedAt
      },
      create: {
        gameId,
        userId,
        playCount,
        status,
        completedAt,
        startedAt
      },
    });
  }
  
  async getGameProgress(getGameProgressDto: GetGameProgressDto) {
    const gameProgress = await this.databaseService.offsetPagination<GameProgressFindManyArgs>({
      model: "gameProgress",
      itemsPerPage: getGameProgressDto.itemsPerPage,
      page: getGameProgressDto.page,
      where: {
        userId: getGameProgressDto.userId,
        gameId: getGameProgressDto.gameId,
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
