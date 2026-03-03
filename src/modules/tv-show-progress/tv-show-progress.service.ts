import { DatabaseService } from "@/shared/infra/database/database.service";
import { Injectable } from "@nestjs/common";
import { CreateOrUpdateTVShowProgressDto } from "./dtos/create-or-update-tv-show-progress.dto";
import { AppException } from '@/shared/exceptions/app.exceptions';
import { ERROR_CODES } from '@/shared/constants/error-codes';
import { GetTVShowProgressDto } from './dtos/get-tv-show-progress.dto';
import { TvShowProgressFindManyArgs } from '@prisma/generated/models';

@Injectable()
export class TVShowProgressService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createOrUpdateTVShowProgress(createOrUpdateTVShowProgressDto: CreateOrUpdateTVShowProgressDto) {
    const { tvShowId, userId, status, episodesWatched, completedAt, startedAt } = createOrUpdateTVShowProgressDto;
    
    const tvShow = await this.databaseService.tvShow.findUnique({
      where: { id: tvShowId },
    });
    
    if (!tvShow) {
      throw new AppException(ERROR_CODES.TV_SHOW_NOT_FOUND);
    }
    
    if (episodesWatched && tvShow.numberOfEpisodes && episodesWatched > tvShow.numberOfEpisodes) {
      throw new AppException(ERROR_CODES.INVALID_EPISODES_WATCHED);
    }

    await this.databaseService.tvShowProgress.upsert({
      where: {
        userId_tvShowId: {
          userId,
          tvShowId,
        },
      },
      update: {
        status,
        episodesWatched,
        completedAt,
        startedAt
      },
      create: {
        tvShowId,
        userId,
        status,
        episodesWatched,
        completedAt,
        startedAt
      },
    });
  }
  
  async getTVShowProgress(getTVShowProgressDto: GetTVShowProgressDto) {
    const tvShowProgress = await this.databaseService.offsetPagination<TvShowProgressFindManyArgs>({
      model: "tvShowProgress",
      itemsPerPage: getTVShowProgressDto.itemsPerPage,
      page: getTVShowProgressDto.page,
      where: {
        userId: getTVShowProgressDto.userId,
        tvShowId: getTVShowProgressDto.tvShowId,
      },
      include: {
        tvShow: true,
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

    return tvShowProgress;
  }
}
