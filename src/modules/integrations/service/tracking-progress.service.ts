import { randomUUID } from "node:crypto";
import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { ProgressStatus } from "@prisma/generated/enums";
import { AnimeEpisodeWatchService } from "@/modules/anime/service/anime-episode-watch.service";
import { AnimeProgressService } from "@/modules/anime/service/anime-progress.service";
import { BookProgressService } from "@/modules/book/service/book-progress.service";
import { GameProgressService } from "@/modules/game/service/game-progress.service";
import { MangaProgressService } from "@/modules/manga/service/manga-progress.service";
import { MovieProgressService } from "@/modules/movie/service/movie-progress.service";
import { TVShowEpisodeWatchService } from "@/modules/tv-show/service/tv-show-episode-watch.service";
import { TVShowProgressService } from "@/modules/tv-show/service/tv-show-progress.service";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import type { MediaType } from "@/shared/media-filter/media-filter.constants";
import {
  bookProgressSchema,
  episodeStatusSchema,
  gameProgressSchema,
  mangaProgressSchema,
  mediaStatusSchema,
} from "../dto/tracking.schema";
import type { TrackingProgressPatch } from "../types/tracking-progress";
import { parseIntegrationInput } from "../utils/parse-integration-input";
import { TrackingLibraryService } from "./tracking-library.service";

const COMMON_STATUSES = [
  ProgressStatus.Planning,
  ProgressStatus.Completed,
  ProgressStatus.Paused,
  ProgressStatus.Dropped,
];
const ACTIVE_STATUSES = {
  anime: [ProgressStatus.NotWatched, ProgressStatus.Watching, ProgressStatus.Rewatching],
  tv: [ProgressStatus.NotWatched, ProgressStatus.Watching, ProgressStatus.Rewatching],
  movie: [ProgressStatus.NotWatched, ProgressStatus.Watching, ProgressStatus.Rewatching],
  game: [ProgressStatus.NotPlayed, ProgressStatus.Playing, ProgressStatus.Replaying],
  manga: [ProgressStatus.NotRead, ProgressStatus.Reading, ProgressStatus.Rereading],
  book: [ProgressStatus.NotRead, ProgressStatus.Reading, ProgressStatus.Rereading],
};

@Injectable()
export class TrackingProgressService {
  constructor(
    private readonly database: DatabaseService,
    private readonly library: TrackingLibraryService,
    private readonly anime: AnimeProgressService,
    private readonly manga: MangaProgressService,
    private readonly tv: TVShowProgressService,
    private readonly movie: MovieProgressService,
    private readonly game: GameProgressService,
    private readonly book: BookProgressService,
    private readonly animeEpisodes: AnimeEpisodeWatchService,
    private readonly tvEpisodes: TVShowEpisodeWatchService,
    private readonly cache: CacheService,
  ) {}

  async setStatus(userId: string, input: unknown) {
    const { type, id, status, startedAt, completedAt, markAllEpisodes } = parseIntegrationInput(
      mediaStatusSchema,
      input,
    );
    if (![...COMMON_STATUSES, ...ACTIVE_STATUSES[type]].includes(status)) {
      throw new UnprocessableEntityException("invalid_media_status");
    }
    if (
      (completedAt && status !== ProgressStatus.Completed) ||
      (markAllEpisodes && (status !== ProgressStatus.Completed || !["anime", "tv"].includes(type)))
    ) {
      throw new UnprocessableEntityException("invalid_completion_options");
    }
    return this.update(
      userId,
      type,
      id,
      (previous) => ({
        status,
        ...(startedAt && { startedAt: new Date(startedAt) }),
        ...(completedAt && { completedAt: new Date(completedAt) }),
        ...(status === ProgressStatus.Completed &&
          !completedAt &&
          !previous?.completedAt && { completedAt: new Date() }),
      }),
      markAllEpisodes,
    );
  }

  async setBook(userId: string, input: unknown) {
    const { id, pagesRead, totalPages } = parseIntegrationInput(bookProgressSchema, input);
    return this.update(userId, "book", id, (previous) => ({
      status: previous?.status ?? ProgressStatus.Reading,
      chaptersRead: pagesRead,
      ...(totalPages !== undefined && { totalPages }),
    }));
  }

  async setManga(userId: string, input: unknown) {
    const { id, chaptersRead } = parseIntegrationInput(mangaProgressSchema, input);
    return this.update(userId, "manga", id, (previous) => ({
      status: previous?.status ?? ProgressStatus.Reading,
      chaptersRead,
    }));
  }

  async setGame(userId: string, input: unknown) {
    const { id, ...patch } = parseIntegrationInput(gameProgressSchema, input);
    return this.update(userId, "game", id, (previous) => ({
      status: previous?.status ?? ProgressStatus.Playing,
      ...patch,
    }));
  }

  async setEpisode(userId: string, input: unknown) {
    const { type, id, episode, season, status } = parseIntegrationInput(episodeStatusSchema, input);
    return this.lock(userId, type, id, async () => {
      await this.assertMedia(type, id);
      if (type === "anime") {
        const previous = await this.database.animeEpisodeWatch.findUnique({
          where: { userId_animeId_episode: { userId, animeId: id, episode } },
        });
        if (previous?.status !== status) {
          await this.animeEpisodes.createOrUpdateAnimeEpisodeWatch({
            userId,
            animeId: id,
            episodes: [{ episode, status }],
          });
        }
        return { changed: previous?.status !== status, type, id, episode, status };
      }
      const previous = await this.database.tvShowEpisodeWatch.findUnique({
        where: { userId_tvShowId_season_episode: { userId, tvShowId: id, season: season!, episode } },
      });
      if (previous?.status !== status) {
        await this.tvEpisodes.createOrUpdateTVShowEpisodeWatch({
          userId,
          tvShowId: id,
          episodes: [{ season: season!, episode, status }],
        });
      }
      return { changed: previous?.status !== status, type, id, season, episode, status };
    });
  }

  private async update(
    userId: string,
    type: MediaType,
    id: string,
    patch: (previous: Awaited<ReturnType<TrackingProgressService["snapshot"]>>) => TrackingProgressPatch,
    markAllEpisodes = false,
  ) {
    return this.lock(userId, type, id, async () => {
      await this.assertMedia(type, id);
      const previous = await this.snapshot(type, userId, id);
      const data = patch(previous);
      const changed =
        !previous ||
        Object.entries(data).some(([key, value]) => {
          if (value === undefined) return false;
          const current = (previous as unknown as Record<string, unknown>)[key];
          if (value instanceof Date) return !(current instanceof Date) || current.getTime() !== value.getTime();
          if (Array.isArray(value)) return JSON.stringify(current) !== JSON.stringify(value);
          return current !== value;
        });

      if (changed || markAllEpisodes) await this.save(type, userId, id, data, markAllEpisodes);
      return {
        changed: changed || markAllEpisodes,
        previousStatus: previous?.status ?? null,
        ...(await this.library.progress(userId, { type, id })),
      };
    });
  }

  private async snapshot(type: MediaType, userId: string, id: string) {
    const readers = {
      anime: () => this.database.animeProgress.findUnique({ where: { userId_animeId: { userId, animeId: id } } }),
      manga: () => this.database.mangaProgress.findUnique({ where: { userId_mangaId: { userId, mangaId: id } } }),
      tv: () => this.database.tvShowProgress.findUnique({ where: { userId_tvShowId: { userId, tvShowId: id } } }),
      movie: () => this.database.movieProgress.findUnique({ where: { userId_movieId: { userId, movieId: id } } }),
      game: () => this.database.gameProgress.findUnique({ where: { userId_gameId: { userId, gameId: id } } }),
      book: () => this.database.bookProgress.findUnique({ where: { userId_bookId: { userId, bookId: id } } }),
    };
    return readers[type]();
  }

  private async save(
    type: MediaType,
    userId: string,
    id: string,
    patch: TrackingProgressPatch,
    markAllEpisodes: boolean,
  ) {
    const common = { userId, ...patch };
    switch (type) {
      case "anime":
        return this.anime.createOrUpdateAnimeProgress({ ...common, animeId: id }, { markAllEpisodes });
      case "manga":
        return this.manga.createOrUpdateMangaProgress({ ...common, mangaId: id });
      case "tv":
        return this.tv.createOrUpdateTVShowProgress({ ...common, tvShowId: id, markAllEpisodes });
      case "movie":
        return this.movie.createOrUpdateMovieProgress({ ...common, movieId: id });
      case "game":
        return this.game.createOrUpdateGameProgress({ ...common, gameId: id });
      case "book":
        return this.book.createOrUpdateBookProgress({ ...common, bookId: id });
    }
  }

  private async assertMedia(type: MediaType, id: string) {
    const readers = {
      anime: () => this.database.anime.findUnique({ where: { id }, select: { id: true } }),
      manga: () => this.database.manga.findUnique({ where: { id }, select: { id: true } }),
      tv: () => this.database.tvShow.findUnique({ where: { id }, select: { id: true } }),
      movie: () => this.database.movie.findUnique({ where: { id }, select: { id: true } }),
      game: () => this.database.game.findUnique({ where: { id }, select: { id: true } }),
      book: () => this.database.book.findUnique({ where: { id }, select: { id: true } }),
    };
    if (!(await readers[type]())) throw new NotFoundException("media_not_found");
  }

  private async lock<T>(userId: string, type: MediaType, id: string, operation: () => Promise<T>) {
    const key = `integrations:write:${userId}:${type}:${id}`;
    const owner = randomUUID();
    const acquired = await this.cache.redis.set(key, owner, { NX: true, PX: 120_000 });
    if (!acquired) throw new ConflictException("progress_update_in_progress");
    try {
      return await operation();
    } finally {
      await this.cache.redis.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        { keys: [key], arguments: [owner] },
      );
    }
  }
}
