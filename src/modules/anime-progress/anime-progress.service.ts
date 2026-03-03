import { DatabaseService } from "@/shared/infra/database/database.service";
import { Injectable } from "@nestjs/common";
import { CreateOrUpdateAnimeProgressDto } from "./dtos/create-or-update-anime-progress.dto";
import { AppException } from '@/shared/exceptions/app.exceptions';
import { ERROR_CODES } from '@/shared/constants/error-codes';
import { GetAnimeProgressesByUserIdDto } from './dtos/get-anime-progresses-by-user-id.dto';
import { AnimeProgressFindManyArgs } from '@prisma/generated/models';

@Injectable()
export class AnimeProgressService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createOrUpdateAnimeProgress(createOrUpdateAnimeProgressDto: CreateOrUpdateAnimeProgressDto) {
    const { animeId, userId, status, episodesWatched, completedAt, startedAt } = createOrUpdateAnimeProgressDto;
    
    const anime = await this.databaseService.anime.findUnique({
      where: { id: animeId },
    });
    
    if (!anime) {
      throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
    }
    
    if (episodesWatched && anime.numberOfEpisodes && episodesWatched > anime.numberOfEpisodes) {
      throw new AppException(ERROR_CODES.INVALID_EPISODES_WATCHED);
    }

    await this.databaseService.animeProgress.upsert({
      where: {
        userId_animeId: {
          userId,
          animeId,
        },
      },
      update: {
        status,
        episodesWatched,
        completedAt,
        startedAt
      },
      create: {
        animeId,
        userId,
        status,
        episodesWatched,
        completedAt,
        startedAt
      },
    });
  }
  
  async getAnimeProgressById(animeProgressId: string) {
    const animeProgress = await this.databaseService.animeProgress.findUnique({
      where: { id: animeProgressId },
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
    
    if (!animeProgress) {
      throw new AppException(ERROR_CODES.PROGRESS_NOT_FOUND);
    }

    return animeProgress;
  }
  
  async getAnimeProgressesByUserId(getAnimeProgressesByUserIdDto: GetAnimeProgressesByUserIdDto) {
    const animeProgresses = await this.databaseService.offsetPagination<AnimeProgressFindManyArgs>({
      model: "animeProgress",
      itemsPerPage: getAnimeProgressesByUserIdDto.itemsPerPage,
      page: getAnimeProgressesByUserIdDto.page,
      where: {
        userId: getAnimeProgressesByUserIdDto.userId,
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

    return animeProgresses;
  }
}
