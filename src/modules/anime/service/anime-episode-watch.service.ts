import { Injectable } from "@nestjs/common";
import { AnimeEpisodeWatch } from "@prisma/generated/client";
import { ActivityType, WatchEpisodeStatus } from "@prisma/generated/enums";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { CreateOrUpdateAnimeEpisodeWatchDto } from "../dto/create-or-update-anime-episode-watch.dto";
import { DeleteAllAnimeEpisodeWatchDto } from "../dto/delete-all-anime-episode-watch.dto";
import { DeleteAnimeEpisodeWatchDto } from "../dto/delete-anime-episode-watch.dto";
import { GetAnimeEpisodeWatchDto } from "../dto/get-anime-episode-watch.dto";
import { WatchAllAnimeEpisodesDto } from "../dto/watch-all-anime-episodes.dto";

const WATCHED_STATUSES: WatchEpisodeStatus[] = [WatchEpisodeStatus.Watching, WatchEpisodeStatus.Completed];

@Injectable()
export class AnimeEpisodeWatchService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly queueService: QueueService,
  ) {}

  private async emitWatchedActivities(userId: string, watches: AnimeEpisodeWatch[]) {
    for (const watch of watches) {
      if (!WATCHED_STATUSES.includes(watch.status)) continue;

      await this.queueService.toActivityJob({
        type: ActivityType.Watched,
        userId,
        animeEpisodeWatchId: watch.id,
        metadata: { ...watch },
      });
    }
  }

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

    const watches: AnimeEpisodeWatch[] = [];

    for (let i = 0; i < episodes.length; i += batchSize) {
      const batch = episodes.slice(i, i + batchSize);

      const results = await Promise.all(
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

      watches.push(...results);
    }

    await this.emitWatchedActivities(userId, watches);
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

    const watches: AnimeEpisodeWatch[] = [];

    for (let i = 0; i < episodeNumbers.length; i += batchSize) {
      const batch = episodeNumbers.slice(i, i + batchSize);

      const results = await Promise.all(
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

      watches.push(...results);
    }

    await this.emitWatchedActivities(userId, watches);
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
