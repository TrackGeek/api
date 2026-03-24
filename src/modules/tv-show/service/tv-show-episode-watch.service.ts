import { Injectable } from "@nestjs/common";
import { CreateOrUpdateTVShowEpisodeWatchDto } from "../dto/create-or-update-tv-show-episode-watch.dto";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { GetTVShowEpisodeWatchDto } from "../dto/get-tv-show-episode-watch.dto";
import { WatchAllEpisodesOfTVShowDto } from "../dto/watch-all-episodes-of-tv-show.dto";
import { DeleteTVShowEpisodeWatchDto } from "../dto/delete-tv-show-episode-watch.dto";
import { DeleteAllTVShowEpisodeWatchDto } from "../dto/delete-all-tv-show-episode-watch.dto";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { WatchEpisodeStatus } from "@prisma/generated/enums";
import { TMDBTVShowSeason } from "@/shared/infra/integrations/tmdb.service";

@Injectable()
export class TVShowEpisodeWatchService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createOrUpdateTVShowEpisodeWatch(createOrUpdateTVShowEpisodeWatchDto: CreateOrUpdateTVShowEpisodeWatchDto) {
    const { tvShowId, userId, episodes } = createOrUpdateTVShowEpisodeWatchDto;

    const tvShow = await this.databaseService.tvShow.findUnique({
      where: { id: tvShowId },
      select: { id: true },
    });

    if (!tvShow) {
      throw new AppException(ERROR_CODES.TV_SHOW_NOT_FOUND);
    }

    const batchSize = 50;

    for (let i = 0; i < episodes.length; i += batchSize) {
      const batch = episodes.slice(i, i + batchSize);

      await Promise.all(
        batch.map(({ season, episode, status }) =>
          this.databaseService.tvShowEpisodeWatch.upsert({
            where: {
              userId_tvShowId_season_episode: {
                userId,
                tvShowId,
                season,
                episode,
              },
            },
            update: { status },
            create: {
              tvShowId,
              season,
              episode,
              status,
              userId,
            },
          }),
        ),
      );
    }
  }

  async watchAllEpisodesOfTVShow({ tvShowId, userId }: WatchAllEpisodesOfTVShowDto) {
    const tvShow = await this.databaseService.tvShow.findUnique({
      where: { id: tvShowId },
      select: { seasons: true },
    });

    if (!tvShow) {
      throw new AppException(ERROR_CODES.TV_SHOW_NOT_FOUND);
    }

    if (!tvShow.seasons) {
      throw new AppException(ERROR_CODES.TV_SHOW_SEASONS_NOT_FOUND);
    }

    const seasons = tvShow.seasons as unknown as TMDBTVShowSeason[];
    const batchSize = 50;

    for (const season of seasons) {
      const episodeNumbers = Array.from({ length: season.numberOfEpisodes }, (_, i) => i + 1);

      for (let i = 0; i < episodeNumbers.length; i += batchSize) {
        const batch = episodeNumbers.slice(i, i + batchSize);

        await Promise.all(
          batch.map((episode) =>
            this.databaseService.tvShowEpisodeWatch.upsert({
              where: {
                userId_tvShowId_season_episode: {
                  userId,
                  tvShowId,
                  season: season.seasonNumber,
                  episode,
                },
              },
              update: { status: WatchEpisodeStatus.Completed },
              create: {
                tvShowId,
                season: season.seasonNumber,
                episode,
                status: WatchEpisodeStatus.Completed,
                userId,
              },
            }),
          ),
        );
      }
    }
  }

  async deleteTVShowEpisodeWatch({ userId, tvShowId, season, episode }: DeleteTVShowEpisodeWatchDto) {
    const watch = await this.databaseService.tvShowEpisodeWatch.findUnique({
      where: { userId_tvShowId_season_episode: { userId, tvShowId, season, episode } },
      select: { userId: true },
    });

    if (!watch || watch.userId !== userId) {
      throw new AppException(ERROR_CODES.NOT_FOUND);
    }

    await this.databaseService.tvShowEpisodeWatch.delete({
      where: { userId_tvShowId_season_episode: { userId, tvShowId, season, episode } },
    });
  }

  async deleteAllTVShowEpisodeWatch({ userId, tvShowId }: DeleteAllTVShowEpisodeWatchDto) {
    await this.databaseService.tvShowEpisodeWatch.deleteMany({
      where: { tvShowId, userId },
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
