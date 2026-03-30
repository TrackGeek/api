import { Injectable } from "@nestjs/common";
import { CreateOrUpdateAnimeEpisodeWatchDto } from "../dto/create-or-update-anime-episode-watch.dto";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { GetAnimeEpisodeWatchDto } from "../dto/get-anime-episode-watch.dto";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { DeleteAnimeEpisodeWatchDto } from "../dto/delete-anime-episode-watch.dto";
import { DeleteAllAnimeEpisodeWatchDto } from "../dto/delete-all-anime-episode-watch.dto";
import { WatchAllAnimeEpisodesDto } from "../dto/watch-all-anime-episodes.dto";
import { WatchEpisodeStatus } from "@prisma/generated/enums";

@Injectable()
export class AnimeEpisodeWatchService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createOrUpdateAnimeEpisodeWatch(createOrUpdateAnimeEpisodeWatchDto: CreateOrUpdateAnimeEpisodeWatchDto) {
    const { animeId, userId, episodes } = createOrUpdateAnimeEpisodeWatchDto;

    const anime = await this.databaseService.anime.findUnique({
      where: { id: animeId },
      select: { id: true, numberOfEpisodes: true },
    });

    if (!anime) {
      throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
    }

    if (anime.numberOfEpisodes) {
      const invalidEpisode = episodes.find(({ episode }) => episode > anime.numberOfEpisodes!);

      if (invalidEpisode) {
        throw new AppException(ERROR_CODES.EPISODE_NOT_FOUND);
      }
    }

    const batchSize = 50;

    for (let i = 0; i < episodes.length; i += batchSize) {
      const batch = episodes.slice(i, i + batchSize);

      await Promise.all(
        batch.map(({ episode, status }) =>
          this.databaseService.animeEpisodeWatch.upsert({
            where: {
              userId_animeId_episode: {
                userId,
                animeId,
                episode,
              },
            },
            update: { status },
            create: {
              animeId,
              episode,
              status,
              userId,
            },
          }),
        ),
      );
    }
  }

  async watchAllAnimeEpisodes({ animeId, userId }: WatchAllAnimeEpisodesDto) {
    const anime = await this.databaseService.anime.findUnique({
      where: { id: animeId },
      select: { numberOfEpisodes: true },
    });

    if (!anime) {
      throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
    }

    if (!anime.numberOfEpisodes) {
      throw new AppException(ERROR_CODES.ANIME_EPISODES_NOT_FOUND);
    }

    const episodeNumbers = Array.from({ length: anime.numberOfEpisodes }, (_, i) => i + 1);
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
  }

  async deleteAnimeEpisodeWatch({ userId, animeId, episode }: DeleteAnimeEpisodeWatchDto) {
    const watch = await this.databaseService.animeEpisodeWatch.findUnique({
      where: { userId_animeId_episode: { userId, animeId, episode } },
      select: { userId: true },
    });

    if (!watch || watch.userId !== userId) {
      throw new AppException(ERROR_CODES.NOT_FOUND);
    }

    await this.databaseService.animeEpisodeWatch.delete({
      where: { userId_animeId_episode: { userId, animeId, episode } },
    });
  }

  async deleteAllAnimeEpisodeWatch({ userId, animeId }: DeleteAllAnimeEpisodeWatchDto) {
    await this.databaseService.animeEpisodeWatch.deleteMany({
      where: { animeId, userId },
    });
  }

  async getAnimeEpisodeWatch(getAnimeEpisodeWatchDto: GetAnimeEpisodeWatchDto) {
    const animeEpisodeWatch = await this.databaseService.animeEpisodeWatch.findMany({
      where: {
        userId: getAnimeEpisodeWatchDto.userId,
        animeId: getAnimeEpisodeWatchDto.animeId,
      },
      orderBy: {
        episode: "asc",
      },
    });

    return animeEpisodeWatch;
  }
}
