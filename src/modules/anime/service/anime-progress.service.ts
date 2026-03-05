import { DatabaseService } from "@/shared/infra/database/database.service";
import { Injectable } from "@nestjs/common";
import { CreateOrUpdateAnimeProgressDto } from "../dto/create-or-update-anime-progress.dto";
import { GetAnimeProgressDto } from "../dto/get-anime-progress.dto";
import { AnimeProgressFindManyArgs } from "@prisma/generated/models";

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

  async getAnimeProgress(getAnimeProgressDto: GetAnimeProgressDto) {
    const animeProgress = await this.databaseService.offsetPagination<AnimeProgressFindManyArgs>({
      model: "animeProgress",
      itemsPerPage: getAnimeProgressDto.itemsPerPage,
      page: getAnimeProgressDto.page,
      where: {
        userId: getAnimeProgressDto.userId,
        animeId: getAnimeProgressDto.animeId,
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
