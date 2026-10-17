import { Injectable } from "@nestjs/common";
import { AnimeProgressService } from "@/modules/anime/service/anime-progress.service";
import { BookProgressService } from "@/modules/book/service/book-progress.service";
import { CatchupFeedService } from "@/modules/catchup/service/catchup-feed.service";
import { GameProgressService } from "@/modules/game/service/game-progress.service";
import { MangaProgressService } from "@/modules/manga/service/manga-progress.service";
import { MovieProgressService } from "@/modules/movie/service/movie-progress.service";
import { TVShowProgressService } from "@/modules/tv-show/service/tv-show-progress.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import type { ProgressFilterParamsDto } from "@/shared/media-filter/dtos/progress-filter.dto";
import type { MediaType } from "@/shared/media-filter/media-filter.constants";
import { catchupSchema, librarySchema, mediaProgressSchema } from "../dto/tracking.schema";
import { normalizeMedia } from "../utils/normalize-media";
import { parseIntegrationInput } from "../utils/parse-integration-input";

const RELATIONS = { anime: "anime", manga: "manga", tv: "tvShow", movie: "movie", game: "game", book: "book" } as const;

@Injectable()
export class TrackingLibraryService {
  constructor(
    private readonly database: DatabaseService,
    private readonly anime: AnimeProgressService,
    private readonly manga: MangaProgressService,
    private readonly tv: TVShowProgressService,
    private readonly movie: MovieProgressService,
    private readonly game: GameProgressService,
    private readonly book: BookProgressService,
    private readonly catchup: CatchupFeedService,
  ) {}

  async profile(userId: string) {
    return this.database.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, username: true, profile: { select: { avatarUrl: true } } },
    });
  }

  async library(userId: string, input: unknown) {
    const { type, status, page, limit } = parseIntegrationInput(librarySchema, input);
    return this.read(type, { userId, status, page, itemsPerPage: limit });
  }

  async progress(userId: string, input: unknown) {
    const { type, id, episodePage } = parseIntegrationInput(mediaProgressSchema, input);
    const page = await this.read(type, { userId, [`${RELATIONS[type]}Id`]: id, page: 1, itemsPerPage: 1 });
    const episodes =
      type === "anime"
        ? await this.database.animeEpisodeWatch.findMany({
            where: { userId, animeId: id },
            select: { episode: true, status: true },
            orderBy: { episode: "asc" },
            skip: (episodePage - 1) * 100,
            take: 101,
          })
        : type === "tv"
          ? await this.database.tvShowEpisodeWatch.findMany({
              where: { userId, tvShowId: id },
              select: { season: true, episode: true, status: true },
              orderBy: [{ season: "asc" }, { episode: "asc" }],
              skip: (episodePage - 1) * 100,
              take: 101,
            })
          : undefined;
    return {
      progress: page.items[0] ?? null,
      episodes: episodes?.slice(0, 100),
      episodePage: episodes ? episodePage : undefined,
      hasMoreEpisodes: episodes ? episodes.length > 100 : undefined,
    };
  }

  async releases(userId: string, input: unknown) {
    const { days, page, limit } = parseIntegrationInput(catchupSchema, input);
    return this.catchup.getFeed({ userId, days, page, itemsPerPage: limit });
  }

  private async read(type: MediaType, params: ProgressFilterParamsDto & { userId: string; [key: string]: unknown }) {
    const readers = {
      anime: async () => (await this.anime.getAnimeProgress(params)).animeProgresses,
      manga: async () => (await this.manga.getMangaProgress(params)).mangaProgresses,
      tv: async () => (await this.tv.getTVShowProgress(params)).tvShowProgresses,
      movie: async () => (await this.movie.getMovieProgress(params)).movieProgresses,
      game: async () => (await this.game.getGameProgress(params)).gameProgresses,
      book: async () => (await this.book.getBookProgress(params)).bookProgresses,
    };
    const result = await readers[type]();
    return {
      ...result,
      items: result.items.map((row: Record<string, unknown>) => ({
        id: row.id,
        media: normalizeMedia(type, row[RELATIONS[type]] as Record<string, unknown>, true),
        status: row.status,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        pagesRead: type === "book" ? row.chaptersRead : undefined,
        totalPages: row.totalPages,
        chaptersRead: type === "manga" ? row.chaptersRead : undefined,
        hoursPlayed: row.hoursPlayed,
        platforms: row.platforms,
        completion: row.completion,
        watchCount: row.watchCount,
        readCount: row.readCount,
        playCount: row.playCount,
        episodeProgress: row.episodeProgress,
      })),
    };
  }
}
