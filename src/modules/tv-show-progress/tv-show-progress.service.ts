import { DatabaseService } from "@/shared/infra/database/database.service";
import { Injectable } from "@nestjs/common";
import { CreateOrUpdateTVShowProgressDto } from "./dtos/create-or-update-tv-show-progress.dto";
import { GetTVShowProgressDto } from "./dtos/get-tv-show-progress.dto";
import { TvShowProgressFindManyArgs } from "@prisma/generated/models";

@Injectable()
export class TVShowProgressService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createOrUpdateTVShowProgress(createOrUpdateTVShowProgressDto: CreateOrUpdateTVShowProgressDto) {
    const { tvShowId, userId, status, watchCount, completedAt, startedAt } = createOrUpdateTVShowProgressDto;

    await this.databaseService.tvShowProgress.upsert({
      where: {
        userId_tvShowId: {
          userId,
          tvShowId,
        },
      },
      update: {
        status,
        watchCount,
        completedAt,
        startedAt,
      },
      create: {
        tvShowId,
        userId,
        status,
        watchCount,
        completedAt,
        startedAt,
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
        tvShow: {
          omit: {
            seasons: true,
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

    return tvShowProgress;
  }
}
