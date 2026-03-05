import { Injectable } from "@nestjs/common";
import { CreateOrUpdateTVShowEpisodeWatchDto } from "./dtos/create-or-update-tv-show-episode-watch.dto";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { GetTVShowEpisodeWatchDto } from "./dtos/get-tv-show-episode-watch.dto";
import { WatchAllEpisodesOfTVShowDto } from "./dtos/watch-all-episodes-of-tv-show.dto";
import { TVShowProgressService } from "../tv-show-progress/tv-show-progress.service";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { ProgressStatus } from "@prisma/generated/enums";
import { TMDBTVShowSeason } from "@/shared/infra/integrations/tmdb.service";

@Injectable()
export class TVShowEpisodeWatchService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly tvShowProgressService: TVShowProgressService,
  ) {}

  async createOrUpdateTVShowEpisodeWatch(createOrUpdateTVShowEpisodeWatchDto: CreateOrUpdateTVShowEpisodeWatchDto) {
    const { tvShowId, episode, season, status, userId } = createOrUpdateTVShowEpisodeWatchDto;

    await this.databaseService.tvShowEpisodeWatch.upsert({
      where: {
        userId_tvShowId_season_episode: {
          userId,
          tvShowId,
          season,
          episode,
        },
      },
      update: {
        status,
      },
      create: {
        season,
        tvShowId,
        episode,
        status,
        userId,
      },
    });
  }

  async watchAllEpisodesOfTVShow(watchAllEpisodesOfTVShowDto: WatchAllEpisodesOfTVShowDto) {
    const { tvShowId, userId } = watchAllEpisodesOfTVShowDto;

    const tvShow = await this.databaseService.tvShow.findUnique({
      where: {
        id: tvShowId,
      },
      select: {
        seasons: true,
      },
    });

    if (!tvShow) {
      throw new AppException(ERROR_CODES.TV_SHOW_NOT_FOUND);
    }

    if (!tvShow.seasons) {
      throw new AppException(ERROR_CODES.TV_SHOW_SEASONS_NOT_FOUND);
    }

    const seasons = tvShow.seasons as unknown as TMDBTVShowSeason[];

    for (const season of seasons) {
      const episodes = season.episodes ?? [];
      const batchSize = 50;

      for (let i = 0; i < episodes.length; i += batchSize) {
        const batch = episodes.slice(i, i + batchSize);

        await Promise.all(
          batch.map((episode) =>
            this.databaseService.tvShowEpisodeWatch.upsert({
              where: {
                userId_tvShowId_season_episode: {
                  userId,
                  tvShowId,
                  season: season.seasonNumber,
                  episode: episode.episodeNumber,
                },
              },
              update: {
                status: ProgressStatus.Completed,
              },
              create: {
                tvShowId,
                season: season.seasonNumber,
                episode: episode.episodeNumber,
                status: ProgressStatus.Completed,
                userId,
              },
            }),
          ),
        );
      }
    }

    await this.tvShowProgressService.createOrUpdateTVShowProgress({
      tvShowId,
      userId,
      status: ProgressStatus.Completed,
    });
  }

  async getTVShowEpisodeWatch(getTVShowEpisodeWatchDto: GetTVShowEpisodeWatchDto) {
    const tvShowEpisodeWatch = await this.databaseService.tvShowEpisodeWatch.findMany({
      where: {
        userId: getTVShowEpisodeWatchDto.userId,
        tvShowId: getTVShowEpisodeWatchDto.tvShowId,
      },
    });

    return tvShowEpisodeWatch;
  }
}
