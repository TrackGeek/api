import { Injectable } from "@nestjs/common";
import { CreateOrUpdateAnimeEpisodeWatchDto } from "./dtos/create-or-update-anime-episode-watch.dto";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { GetAnimeEpisodeWatchDto } from "./dtos/get-anime-episode-watch.dto";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { ProgressStatus, WatchEpisodeStatus } from "@prisma/generated/enums";
import { WatchAllEpisodesOfAnimeDto } from "./dtos/watch-all-episodes-of-anime.dto";
import { AnimeProgressService } from "../anime-progress/anime-progress.service";

@Injectable()
export class AnimeEpisodeWatchService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly animeProgressService: AnimeProgressService,
  ) {}

  async createOrUpdateAnimeEpisodeWatch(createOrUpdateAnimeEpisodeWatchDto: CreateOrUpdateAnimeEpisodeWatchDto) {
    const { animeId, episode, status, userId } = createOrUpdateAnimeEpisodeWatchDto;

    await this.databaseService.animeEpisodeWatch.upsert({
      where: {
        userId_animeId_episode: {
          userId,
          animeId,
          episode,
        },
      },
      update: {
        status,
      },
      create: {
        animeId,
        episode,
        status,
        userId,
      },
    });
  }

  async watchAllEpisodesOfAnime(watchAllEpisodesOfAnimeDto: WatchAllEpisodesOfAnimeDto) {
    const { animeId, userId } = watchAllEpisodesOfAnimeDto;

    const anime = await this.databaseService.anime.findUnique({
      where: {
        id: animeId,
      },
      select: {
        episodes: true,
      },
    });

    if (!anime) {
      throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
    }

    if (!anime.episodes) {
      throw new AppException(ERROR_CODES.ANIME_EPISODES_NOT_FOUND);
    }

    const episodes: any = anime.episodes ?? [];
    const batchSize = 50;

    for (let i = 0; i < episodes.length; i += batchSize) {
      const batch = episodes.slice(i, i + batchSize);

      await Promise.all(
        batch.map((episode) =>
          this.databaseService.animeEpisodeWatch.upsert({
            where: {
              userId_animeId_episode: {
                userId,
                animeId,
                episode: episode.episodeNumber,
              },
            },
            update: {
              status: WatchEpisodeStatus.Completed,
            },
            create: {
              animeId,
              episode: episode.episodeNumber,
              status: WatchEpisodeStatus.Completed,
              userId,
            },
          }),
        ),
      );
    }

    await this.animeProgressService.createOrUpdateAnimeProgress({
      animeId,
      userId,
      status: ProgressStatus.Completed,
    });
  }

  async getAnimeEpisodeWatch(getAnimeEpisodeWatchDto: GetAnimeEpisodeWatchDto) {
    const animeEpisodeWatch = await this.databaseService.animeEpisodeWatch.findMany({
      where: {
        userId: getAnimeEpisodeWatchDto.userId,
        animeId: getAnimeEpisodeWatchDto.animeId,
      },
    });

    return animeEpisodeWatch;
  }
}
