import { Processor, WorkerHost } from "@nestjs/bullmq";
import { ListType, WatchEpisodeStatus } from "@prisma/generated/enums";
import { Job } from "bullmq";
import { AnimeService } from "@/modules/anime/service/anime.service";
import { AnimeEpisodeWatchService } from "@/modules/anime/service/anime-episode-watch.service";
import { AnimeProgressService } from "@/modules/anime/service/anime-progress.service";
import { AnimeReviewService } from "@/modules/anime/service/anime-review.service";
import { ListService } from "@/modules/list/service/list.service";
import { MangaService } from "@/modules/manga/service/manga.service";
import { MangaProgressService } from "@/modules/manga/service/manga-progress.service";
import { MangaReviewService } from "@/modules/manga/service/manga-review.service";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import {
  ANILIST_IMPORT_QUEUE,
  type AnilistImportReport,
  type AnilistJobData,
  emptyAnilistReport,
} from "./anilist-job.service";
import type { AnilistMappedEntry } from "./anilist-mapping";

@Processor(ANILIST_IMPORT_QUEUE, { concurrency: 1 })
export class AnilistImportProcessor extends WorkerHost {
  constructor(
    private readonly db: DatabaseService,
    private readonly anime: AnimeService,
    private readonly manga: MangaService,
    private readonly animeProgress: AnimeProgressService,
    private readonly mangaProgress: MangaProgressService,
    private readonly episodes: AnimeEpisodeWatchService,
    private readonly animeReviews: AnimeReviewService,
    private readonly mangaReviews: MangaReviewService,
    private readonly lists: ListService,
  ) {
    super();
  }

  async process(job: Job<AnilistJobData>) {
    const previous =
      typeof job.progress === "object"
        ? (job.progress as AnilistImportReport)
        : emptyAnilistReport(job.data.entries.length);
    const report = { ...previous, items: [...previous.items] };
    const completed = new Set(report.items.map((item) => item.mediaId));
    const pending = job.data.entries.filter(
      (mapped) => !completed.has(mapped.state === "ready" ? mapped.entry.mediaId : mapped.mediaId),
    );
    let cursor = 0;
    let persistence = Promise.resolve();
    let stopped = false;
    const worker = async () => {
      while (!stopped && cursor < pending.length) {
        const mapped = pending[cursor++];
        if (mapped.state === "skipped") {
          report.skipped++;
          report.items.push({ ...mapped });
        } else {
          const entry = mapped.entry;
          try {
            for (let attempt = 0; ; attempt++) {
              try {
                await this.importEntry(entry, job.data.userId);
                break;
              } catch (error) {
                const status = error instanceof AppException ? error.getStatus() : undefined;
                if (attempt >= 3 || !status || (status !== 429 && status < 500)) throw error;
                await new Promise((resolve) => setTimeout(resolve, status === 429 ? 60_000 : 10_000));
              }
            }
            report.imported++;
            report.items.push({
              mediaId: entry.mediaId,
              name: entry.name,
              state: "imported",
              warnings: entry.warnings,
            });
          } catch (error) {
            const status = error instanceof AppException ? error.getStatus() : undefined;
            const state = status === 404 ? "unmatched" : "failed";
            const response =
              error instanceof AppException ? (error.getResponse() as { code: { code: string } }) : undefined;
            report[state]++;
            report.items.push({
              mediaId: entry.mediaId,
              name: entry.name,
              state,
              reason: response?.code?.code ?? "IMPORT_FAILED",
              warnings: entry.warnings,
            });
          }
        }
        const checkpoint = { ...report, items: [...report.items] };
        persistence = persistence.then(() => job.updateProgress(checkpoint));
        try {
          await persistence;
        } catch (error) {
          stopped = true;
          throw error;
        }
      }
    };
    const workers = await Promise.allSettled(Array.from({ length: Math.min(4, pending.length) }, worker));
    const failure = workers.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    return report;
  }

  async importEntry(entry: AnilistMappedEntry, userId: string) {
    const isAnime = entry.type === "ANIME";
    let media = isAnime
      ? await this.db.anime.findUnique({ where: { malId: entry.externalId }, select: { id: true } })
      : await this.db.manga.findUnique({ where: { anilistId: entry.externalId }, select: { id: true } });
    if (!media) {
      await this.limitCatalogueRequest(entry.type);
      media = isAnime
        ? await this.anime.getAnimeByMalId(entry.externalId)
        : await this.manga.getMangaByAnilistId(entry.externalId);
    }
    const id = media.id;
    const dates = {
      startedAt: entry.startedAt ? new Date(entry.startedAt) : undefined,
      completedAt: entry.completedAt ? new Date(entry.completedAt) : undefined,
    };
    const datesMatch = (previous: { startedAt: Date | null; completedAt: Date | null }) =>
      (!dates.startedAt || previous.startedAt?.getTime() === dates.startedAt.getTime()) &&
      (!dates.completedAt || previous.completedAt?.getTime() === dates.completedAt.getTime());
    if (isAnime) {
      const previous = await this.db.animeProgress.findUnique({ where: { userId_animeId: { userId, animeId: id } } });
      if (
        !previous ||
        previous.status !== entry.status ||
        previous.watchCount !== entry.repeat ||
        !datesMatch(previous)
      ) {
        await this.animeProgress.createOrUpdateAnimeProgress(
          { animeId: id, userId, status: entry.status, watchCount: entry.repeat, ...dates },
          { markAllEpisodes: false },
        );
      }
      const watched = await this.db.animeEpisodeWatch.findMany({
        where: { userId, animeId: id, status: WatchEpisodeStatus.Completed },
        select: { episode: true },
      });
      const existing = new Set(watched.map((episode) => episode.episode));
      const episodes = Array.from({ length: entry.progress }, (_, index) => index + 1)
        .filter((episode) => !existing.has(episode))
        .map((episode) => ({ episode, status: WatchEpisodeStatus.Completed }));
      if (episodes.length) await this.episodes.createOrUpdateAnimeEpisodeWatch({ animeId: id, userId, episodes });
    } else {
      const previous = await this.db.mangaProgress.findUnique({ where: { userId_mangaId: { userId, mangaId: id } } });
      if (
        !previous ||
        previous.status !== entry.status ||
        previous.chaptersRead !== entry.progress ||
        previous.readCount !== entry.repeat ||
        !datesMatch(previous)
      ) {
        await this.mangaProgress.createOrUpdateMangaProgress({
          mangaId: id,
          userId,
          status: entry.status,
          chaptersRead: entry.progress,
          readCount: entry.repeat,
          ...dates,
        });
      }
    }
    if (Object.keys(entry.review).length || entry.notes !== undefined) {
      if (isAnime) {
        const existing = await this.db.animeReview.findUnique({ where: { userId_animeId: { userId, animeId: id } } });
        const body = {
          ...entry.review,
          notes: entry.notes,
          overall: entry.review.overall ?? Number(existing?.overall ?? 0),
          animeId: id,
          userId,
        };
        if (existing) await this.animeReviews.updateAnimeReview({ ...body, animeReviewId: existing.id });
        else await this.animeReviews.createAnimeReview(body);
      } else {
        const existing = await this.db.mangaReview.findUnique({ where: { userId_mangaId: { userId, mangaId: id } } });
        const body = {
          art: entry.review.art,
          notes: entry.notes,
          overall: entry.review.overall ?? Number(existing?.overall ?? 0),
          mangaId: id,
          userId,
        };
        if (existing) await this.mangaReviews.updateMangaReview({ ...body, mangaReviewId: existing.id });
        else await this.mangaReviews.createMangaReview(body);
      }
    }
    for (const sourceName of entry.lists) {
      await this.withListLock(userId, sourceName, async () => {
        const type = isAnime ? ListType.Anime : ListType.Manga;
        let name = sourceName;
        let list = await this.db.list.findUnique({ where: { userId_name: { userId, name } } });
        if (list && list.type !== type) {
          name = `${sourceName} (${type})`;
          entry.warnings.push(`listRenamed:${sourceName}:${name}`);
          list = await this.db.list.findUnique({ where: { userId_name: { userId, name } } });
        }
        if (list && list.type !== type) throw new Error("LIST_TYPE_CONFLICT");
        if (!list) {
          await this.lists.createList({ userId, name, type });
          list = await this.db.list.findUniqueOrThrow({ where: { userId_name: { userId, name } } });
        }
        const key = isAnime ? { animeId: id } : { mangaId: id };
        if (!(await this.db.listItem.findFirst({ where: { listId: list.id, ...key } }))) {
          await this.lists.addItemToList({ listId: list.id, userId, type, ...key });
        }
      });
    }
  }

  private readonly listLocks = new Map<string, Promise<void>>();
  private readonly nextCatalogueRequest = { ANIME: 0, MANGA: 0 };

  private async limitCatalogueRequest(type: "ANIME" | "MANGA") {
    const now = Date.now();
    const wait = Math.max(0, this.nextCatalogueRequest[type] - now);
    this.nextCatalogueRequest[type] = now + wait + (type === "ANIME" ? 250 : 2100);
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  }

  private async withListLock(userId: string, name: string, operation: () => Promise<void>) {
    const key = JSON.stringify([userId, name]);
    const previous = this.listLocks.get(key) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    this.listLocks.set(key, current);
    try {
      await current;
    } finally {
      if (this.listLocks.get(key) === current) this.listLocks.delete(key);
    }
  }
}
