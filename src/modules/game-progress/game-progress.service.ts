import { DatabaseService } from "@/shared/infra/database/database.service";
import { Injectable } from "@nestjs/common";
import { CreateOrUpdateGameProgressDto } from "./dtos/create-or-update-game-progress.dto";
import { AppException } from '@/shared/exceptions/app.exceptions';
import { ERROR_CODES } from '@/shared/constants/error-codes';
import { GetGameProgressesByUserIdDto } from './dtos/get-game-progresses-by-user-id.dto';
import { GameProgressFindManyArgs } from '@prisma/generated/models';

@Injectable()
export class GameProgressService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createOrUpdateGameProgress(createOrUpdateGameProgressDto: CreateOrUpdateGameProgressDto) {
    const { gameId, userId, status, completedAt, startedAt } = createOrUpdateGameProgressDto;

    await this.databaseService.gameProgress.upsert({
      where: {
        userId_gameId: {
          userId,
          gameId,
        },
      },
      update: {
        status,
        completedAt,
        startedAt
      },
      create: {
        gameId,
        userId,
        status,
        completedAt,
        startedAt
      },
    });
  }
  
  async getGameProgressById(gameProgressId: string) {
    const gameProgress = await this.databaseService.gameProgress.findUnique({
      where: { id: gameProgressId },
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
    
    if (!gameProgress) {
      throw new AppException(ERROR_CODES.PROGRESS_NOT_FOUND);
    }

    return gameProgress;
  }
  
  async getGameProgressesByUserId(getGameProgressesByUserIdDto: GetGameProgressesByUserIdDto) {
    const gameProgresses = await this.databaseService.offsetPagination<GameProgressFindManyArgs>({
      model: "gameProgress",
      itemsPerPage: getGameProgressesByUserIdDto.itemsPerPage,
      page: getGameProgressesByUserIdDto.page,
      where: {
        userId: getGameProgressesByUserIdDto.userId,
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

    return gameProgresses;
  }
}
