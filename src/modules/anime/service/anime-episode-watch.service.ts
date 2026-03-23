import { Injectable } from "@nestjs/common";
import { CreateOrUpdateAnimeEpisodeWatchDto } from "../dto/create-or-update-anime-episode-watch.dto";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { GetAnimeEpisodeWatchDto } from "../dto/get-anime-episode-watch.dto";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { ProgressStatus, WatchEpisodeStatus } from "@prisma/generated/enums";
import { AnimeProgressService } from "./anime-progress.service";

@Injectable()
export class AnimeEpisodeWatchService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly animeProgressService: AnimeProgressService,
  ) {}

  async createOrUpdateAnimeEpisodeWatch(createOrUpdateAnimeEpisodeWatchDto: CreateOrUpdateAnimeEpisodeWatchDto) {
    const { animeId, userId, episodes, all } = createOrUpdateAnimeEpisodeWatchDto;

    const anime = await this.databaseService.anime.findUnique({
      where: { id: animeId },
      select: { episodes: true, numberOfEpisodes: true },
    });

    if (!anime) {
      throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
    }

    if (anime.numberOfEpisodes === null) {
      throw new AppException(ERROR_CODES.ANIME_EPISODES_NOT_FOUND);
    }

    if (all !== undefined) {
      const episodeNumbers = Array.from({ length: anime.numberOfEpisodes! }, (_, i) => i + 1);

      if (!episodeNumbers) {
        throw new AppException(ERROR_CODES.ANIME_EPISODES_NOT_FOUND);
      }

      const episodeStatus = all ? WatchEpisodeStatus.Completed : WatchEpisodeStatus.NotWatched;
      const batchSize = 50;

      for (let i = 0; i < episodeNumbers.length; i += batchSize) {
        const batch = episodeNumbers.slice(i, i + batchSize);

        await Promise.all(
          batch.map((episode) =>
            this.databaseService.animeEpisodeWatch.upsert({
              where: {
                userId_animeId_episode: {
                  userId,
                  animeId,
                  episode,
                },
              },
              update: { status: episodeStatus },
              create: {
                animeId,
                episode,
                status: episodeStatus,
                userId,
              },
            }),
          ),
        );
      }

      await this.animeProgressService.createOrUpdateAnimeProgress({
        animeId,
        userId,
        status: all ? ProgressStatus.Completed : ProgressStatus.Planning,
      });

      return;
    }

    await Promise.all(
      (episodes ?? []).map((episode) =>
        this.databaseService.animeEpisodeWatch.upsert({
          where: {
            userId_animeId_episode: {
              userId,
              animeId,
              episode,
            },
          },
          update: { status: WatchEpisodeStatus.Completed },
          create: {
            animeId,
            episode,
            status: WatchEpisodeStatus.Completed,
            userId,
          },
        }),
      ),
    );
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
