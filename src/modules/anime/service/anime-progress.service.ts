import { DatabaseService } from "@/shared/infra/database/database.service";
import { Injectable } from "@nestjs/common";
import { CreateOrUpdateAnimeProgressDto } from "../dto/create-or-update-anime-progress.dto";
import { GetAnimeProgressDto } from "../dto/get-anime-progress.dto";
import { AnimeProgressFindManyArgs } from "@prisma/generated/models";
import { AppException } from '@/shared/exceptions/app.exceptions';
import { ERROR_CODES } from '@/shared/constants/error-codes';

@Injectable()
export class AnimeProgressService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createOrUpdateAnimeProgress(createOrUpdateAnimeProgressDto: CreateOrUpdateAnimeProgressDto) {
    const { animeId, userId, status, watchCount, completedAt, startedAt } = createOrUpdateAnimeProgressDto;

    await this.databaseService.animeProgress.upsert({
      where: {
        userId_animeId: {
          userId,
          animeId,
        },
      },
      update: {
        status,
        watchCount,
        completedAt,
        startedAt,
      },
      create: {
        animeId,
        watchCount,
        userId,
        status,
        completedAt,
        startedAt,
      },
    });
  }

  async deleteAnimeProgress(animeProgressId: string, userId: string) {
    const animeProgress = await this.databaseService.animeProgress.findUnique({
      where: { id: animeProgressId },
      select: { animeId: true, userId: true },
    });

    if (!animeProgress || animeProgress.userId !== userId) {
      throw new AppException(ERROR_CODES.PROGRESS_NOT_FOUND);
    }
    
    await this.databaseService.$transaction([
      this.databaseService.animeEpisodeWatch.deleteMany({
        where: { animeId: animeProgress.animeId, userId },
      }),
      this.databaseService.animeProgress.delete({
        where: { id: animeProgressId },
      }),
    ]);
  }

  async getAnimeProgress(getAnimeProgressDto: GetAnimeProgressDto) {
    const animeProgress = await this.databaseService.offsetPagination<AnimeProgressFindManyArgs>({
      model: "animeProgress",
      itemsPerPage: getAnimeProgressDto.itemsPerPage,
      page: getAnimeProgressDto.page,
      where: {
        ...(getAnimeProgressDto.animeId && { animeId: getAnimeProgressDto.animeId }),
        ...(getAnimeProgressDto.userId && { userId: getAnimeProgressDto.userId }),
      },
      include: {
        anime: {
          omit: {
            episodes: true,
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

    return animeProgress;
  }
}
