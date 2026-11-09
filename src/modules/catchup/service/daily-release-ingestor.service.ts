import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/generated/client";
import { CatchupMediaType, ReleaseEventType, ReleaseSource } from "@prisma/generated/enums";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import { addDays, endOfDayInTimeZone, startOfDayInTimeZone } from "@/shared/utils/date";
import {
  AIRING_ANIME_STATUSES,
  CATCHUP_AUDIT_ACTIONS,
  EXTERNAL_REQUEST_DELAY_MS,
  PREQUEL_RELATION_TYPES,
  RELEASING_MANGA_STATUSES,
  RETURNING_TV_SHOW_STATUSES,
} from "../constants/catchup.constants";
import { RawExternalRelease } from "../types/catchup.types";
import { hasMediaContentChanges } from "../utils/media-content-changes";
import { getNextReleaseCheckAt } from "../utils/release-check-schedule";
import { CatchupAuditService } from "./catchup-audit.service";
import { CatchupFlagsService } from "./catchup-flags.service";

export interface ReleaseWindow {
  readonly start: Date;
  readonly end: Date;
}

@Injectable()
export class DailyReleaseIngestorService {
  private readonly logger = new Logger(DailyReleaseIngestorService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
    private readonly catchupFlagsService: CatchupFlagsService,
    private readonly catchupAuditService: CatchupAuditService,
    private readonly cacheService: CacheService,
  ) {}

  buildWindow(runDate: Date): ReleaseWindow {
    const timeZone = this.catchupFlagsService.timeZone;
    const toleranceDays = this.catchupFlagsService.toleranceDays;

    return {
      start: startOfDayInTimeZone(addDays(runDate, -toleranceDays), timeZone),
      end: endOfDayInTimeZone(runDate, timeZone),
    };
  }

  async fetchReleases(runDate: Date, runId: string | null = null): Promise<RawExternalRelease[]> {
    const window = this.buildWindow(runDate);
    const flags = this.catchupFlagsService.flags;

    const releases: RawExternalRelease[] = [];

    if (flags.animeEpisodeNotificationsEnabled) {
      releases.push(...(await this.guard("Anime", runId, () => this.ingestAnimeEpisodes(window))));
    }

    if (flags.mangaChapterNotificationsEnabled) {
      releases.push(...(await this.guard("Manga", runId, () => this.ingestMangaChapters())));
    }

    if (flags.tvShowEpisodeNotificationsEnabled) {
      releases.push(...(await this.guard("TvShow", runId, () => this.ingestTvShowEpisodes(window))));
    }

    if (flags.gamesReleaseNotificationsEnabled) {
      releases.push(...(await this.guard("Game", runId, () => this.ingestGameReleases(window))));
    }

    if (flags.sequelAddedNotificationsEnabled) {
      releases.push(...(await this.guard("Sequel", runId, () => this.ingestSequels(window))));
    }

    return releases;
  }

  private async guard(
    scope: string,
    runId: string | null,
    ingest: () => Promise<RawExternalRelease[]>,
  ): Promise<RawExternalRelease[]> {
    try {
      return await ingest();
    } catch (error: any) {
      this.logger.error(`Catch-up ingestion failed | scope=${scope} error=${error.message}`);
      await this.catchupAuditService.record(
        CATCHUP_AUDIT_ACTIONS.INGESTION_FAILED,
        { scope, error: error.message },
        runId,
      );

      return [];
    }
  }

  private async ingestAnimeEpisodes(window: ReleaseWindow): Promise<RawExternalRelease[]> {
    const animes = await this.databaseService.anime.findMany({
      where: {
        status: { in: [...AIRING_ANIME_STATUSES] },
        OR: [{ nextReleaseCheckAt: null }, { nextReleaseCheckAt: { lte: new Date() } }],
      },
      orderBy: [{ nextReleaseCheckAt: { sort: "asc", nulls: "first" } }, { id: "asc" }],
      take: this.catchupFlagsService.batchSize,
    });

    const releases: RawExternalRelease[] = [];

    for (const anime of animes) {
      try {
        const details = await this.integrationsService.tenrai.getAnimeById(anime.malId, true);
        const contentChanged = hasMediaContentChanges(anime, details);
        const previous = anime.numberOfEpisodes ?? 0;
        const current = details.numberOfEpisodes ?? 0;
        const episodesChanged =
          current !== previous ||
          details.status !== anime.status ||
          details.status === "Currently Airing" ||
          details.status === "RELEASING";

        if (episodesChanged) {
          const pages = new Set(["1", ...Object.keys(anime.episodes ?? {})]);
          for (const page of pages) {
            await this.cacheService.delete(
              CACHE_KEYS.TENRAI_ANIME_EPISODES_BY_ID.prefix({ malId: anime.malId, page: Number(page) }),
            );
          }
        }

        await this.databaseService.anime.update({
          where: { malId: anime.malId },
          data: {
            ...(details as any),
            ...(episodesChanged ? { episodes: Prisma.JsonNull } : {}),
            ...(contentChanged ? { lastRefreshedAt: new Date() } : {}),
            lastReleaseCheckedAt: new Date(),
            nextReleaseCheckAt: getNextReleaseCheckAt({
              now: new Date(),
              timeZone: this.catchupFlagsService.timeZone,
              nextAirDate: details.aired?.from,
              active: details.status !== "Not yet aired",
            }),
          },
        });

        for (let episode = previous + 1; episode <= current; episode++) {
          releases.push({
            source: ReleaseSource.Tenrai,
            mediaType: CatchupMediaType.Anime,
            eventType: ReleaseEventType.NewEpisodeReleased,
            externalId: anime.malId,
            title: details.title ?? anime.title,
            unitNumber: episode,
            releaseAt: window.end,
            kind: details.type,
            payload: { malId: anime.malId, animeId: anime.id, episode },
          });
        }
      } catch (error: any) {
        this.logger.warn(`Skipped anime during catch-up | malId=${anime.malId} error=${error.message}`);
      }

      await this.delay();
    }

    return releases;
  }

  private async ingestMangaChapters(): Promise<RawExternalRelease[]> {
    const mangas = await this.databaseService.manga.findMany({
      where: { status: { in: [...RELEASING_MANGA_STATUSES] }, anilistId: { not: null } },
      select: { id: true, anilistId: true, title: true, numberOfChapters: true },
      take: this.catchupFlagsService.batchSize,
    });

    const releases: RawExternalRelease[] = [];

    for (const manga of mangas) {
      if (!manga.anilistId) {
        continue;
      }

      try {
        const details = await this.integrationsService.anilist.getMangaById(manga.anilistId);

        await this.databaseService.manga.update({
          where: { anilistId: manga.anilistId },
          data: { ...(details as any), lastRefreshedAt: new Date() },
        });

        const previous = manga.numberOfChapters ?? 0;
        const current = details.numberOfChapters ?? 0;

        for (let chapter = previous + 1; chapter <= current; chapter++) {
          releases.push({
            source: ReleaseSource.Anilist,
            mediaType: CatchupMediaType.Manga,
            eventType: ReleaseEventType.NewChapterReleased,
            externalId: manga.anilistId,
            title: details.title ?? manga.title,
            unitNumber: chapter,
            kind: details.type,
            payload: { anilistId: manga.anilistId, mangaId: manga.id, chapter },
          });
        }
      } catch (error: any) {
        this.logger.warn(`Skipped manga during catch-up | anilistId=${manga.anilistId} error=${error.message}`);
      }

      await this.delay();
    }

    return releases;
  }

  private async ingestTvShowEpisodes(window: ReleaseWindow): Promise<RawExternalRelease[]> {
    const tvShows = await this.databaseService.tvShow.findMany({
      where: {
        AND: [
          { OR: [{ inProduction: true }, { status: { in: [...RETURNING_TV_SHOW_STATUSES] } }] },
          { OR: [{ nextReleaseCheckAt: null }, { nextReleaseCheckAt: { lte: new Date() } }] },
        ],
      },
      orderBy: [{ nextReleaseCheckAt: { sort: "asc", nulls: "first" } }, { id: "asc" }],
      take: this.catchupFlagsService.batchSize,
    });

    const releases: RawExternalRelease[] = [];

    for (const tvShow of tvShows) {
      try {
        const details = await this.integrationsService.tmdb.getTVShowById(tvShow.tmdbId, true);
        const contentChanged = hasMediaContentChanges(tvShow, details);
        const lastEpisode = details.lastEpisodeToAir;
        const previousEpisode = tvShow.lastEpisodeToAir as { seasonNumber?: number; episodeNumber?: number } | null;
        const episodesChanged =
          lastEpisode &&
          (lastEpisode.seasonNumber !== previousEpisode?.seasonNumber ||
            lastEpisode.episodeNumber !== previousEpisode?.episodeNumber);

        if (episodesChanged) {
          const storedEpisodes = (tvShow.episodes ?? []) as { seasonNumber: number }[];
          const seasons = new Set([lastEpisode.seasonNumber, ...storedEpisodes.map((episode) => episode.seasonNumber)]);
          for (const season of seasons) {
            await this.cacheService.delete(CACHE_KEYS.TMDB_TV_SHOW_SEASON_EPISODES_BY_ID.prefix(tvShow.tmdbId, season));
          }
          await this.cacheService.delete(CACHE_KEYS.TMDB_TV_SHOW_SEASONS_BY_ID.prefix(tvShow.tmdbId));
        }

        await this.databaseService.tvShow.update({
          where: { tmdbId: tvShow.tmdbId },
          data: {
            ...(details as any),
            ...(episodesChanged ? { episodes: Prisma.JsonNull, seasons: Prisma.JsonNull } : {}),
            ...(contentChanged ? { lastRefreshedAt: new Date() } : {}),
            lastReleaseCheckedAt: new Date(),
            nextReleaseCheckAt: getNextReleaseCheckAt({
              now: new Date(),
              timeZone: this.catchupFlagsService.timeZone,
              nextAirDate: details.nextEpisodeToAir?.airDate,
              lastAirDate: lastEpisode?.airDate,
            }),
          },
        });

        const releaseWindow = {
          start:
            tvShow.lastReleaseCheckedAt && tvShow.lastReleaseCheckedAt < window.start
              ? tvShow.lastReleaseCheckedAt
              : window.start,
          end: window.end,
        };

        if (!lastEpisode?.airDate || !this.isWithin(new Date(lastEpisode.airDate), releaseWindow)) {
          continue;
        }

        releases.push({
          source: ReleaseSource.Tmdb,
          mediaType: CatchupMediaType.TvShow,
          eventType: ReleaseEventType.NewEpisodeReleased,
          externalId: tvShow.tmdbId,
          title: details.name ?? tvShow.name,
          unitNumber: lastEpisode.episodeNumber,
          containerNumber: lastEpisode.seasonNumber,
          unitTitle: lastEpisode.name,
          releaseAt: lastEpisode.airDate,
          kind: details.type,
          payload: { tmdbId: tvShow.tmdbId, tvShowId: tvShow.id },
        });
      } catch (error: any) {
        this.logger.warn(`Skipped TV show during catch-up | tmdbId=${tvShow.tmdbId} error=${error.message}`);
      } finally {
        await this.delay();
      }
    }

    return releases;
  }

  private async ingestGameReleases(window: ReleaseWindow): Promise<RawExternalRelease[]> {
    const games = await this.databaseService.game.findMany({
      where: { firstReleaseDate: { gte: window.start, lte: window.end } },
      select: { id: true, igdbId: true, name: true, firstReleaseDate: true, gameStatus: true, lastRefreshedAt: true },
      take: this.catchupFlagsService.batchSize,
    });

    const releases: RawExternalRelease[] = [];

    for (const game of games) {
      const refreshed = await this.refreshReleasedGame(game);

      const releaseAt = refreshed?.firstReleaseDate ?? game.firstReleaseDate;
      if (!releaseAt || !this.isWithin(releaseAt, window)) {
        continue;
      }

      releases.push({
        source: ReleaseSource.Igdb,
        mediaType: CatchupMediaType.Game,
        eventType: ReleaseEventType.NewGameReleased,
        externalId: game.igdbId,
        title: refreshed?.name ?? game.name,
        releaseAt,
        kind: refreshed?.gameStatus ?? game.gameStatus,
        payload: { igdbId: game.igdbId, gameId: game.id },
      });
    }

    return releases;
  }

  private async refreshReleasedGame(game: {
    igdbId: number;
    lastRefreshedAt: Date | null;
  }): Promise<{ name?: string | null; firstReleaseDate?: Date | null; gameStatus?: string | null } | null> {
    if (game.lastRefreshedAt && Date.now() - game.lastRefreshedAt.getTime() < REFRESH_INTERVAL_MS) {
      return null;
    }

    try {
      const details = await this.integrationsService.igdb.getGameById(game.igdbId);

      const updated = await this.databaseService.game.update({
        where: { igdbId: game.igdbId },
        data: { ...(details as any), lastRefreshedAt: new Date() },
        select: { name: true, firstReleaseDate: true, gameStatus: true },
      });

      return updated;
    } catch (error: any) {
      this.logger.warn(`Skipped game refresh during catch-up | igdbId=${game.igdbId} error=${error.message}`);

      return null;
    } finally {
      await this.delay();
    }
  }

  private async ingestSequels(window: ReleaseWindow): Promise<RawExternalRelease[]> {
    const animes = await this.databaseService.anime.findMany({
      where: { createdAt: { gte: window.start, lte: window.end } },
      select: { id: true, malId: true, title: true, relations: true },
      take: this.catchupFlagsService.batchSize,
    });

    const releases: RawExternalRelease[] = [];

    for (const anime of animes) {
      try {
        const relations = (anime.relations ??
          (await this.integrationsService.tenrai.getAnimeRelationsById(anime.malId))) as
          | { relationType?: string; entry?: { malId: number; title: string; type?: string }[] }[]
          | null;

        if (!Array.isArray(relations)) {
          continue;
        }

        const prequelMalIds = relations
          .filter((relation) => PREQUEL_RELATION_TYPES.includes((relation.relationType ?? "").toLowerCase() as any))
          .flatMap((relation) => relation.entry ?? [])
          .filter((entry) => (entry.type ?? "anime").toLowerCase() === "anime")
          .map((entry) => entry.malId)
          .filter((malId): malId is number => Number.isFinite(malId));

        if (prequelMalIds.length === 0) {
          continue;
        }

        const prequels = await this.databaseService.anime.findMany({
          where: { malId: { in: prequelMalIds } },
          select: { id: true, malId: true, title: true },
        });

        for (const prequel of prequels) {
          releases.push({
            source: ReleaseSource.Tenrai,
            mediaType: CatchupMediaType.Anime,
            eventType: ReleaseEventType.SequelAdded,
            externalId: anime.malId,
            title: anime.title,
            releaseAt: window.end,
            discriminator: `prequel:${prequel.id}`,
            payload: {
              malId: anime.malId,
              animeId: anime.id,
              prequelAnimeId: prequel.id,
              prequelMalId: prequel.malId,
              prequelTitle: prequel.title,
            },
          });
        }
      } catch (error: any) {
        this.logger.warn(`Skipped sequel detection | malId=${anime.malId} error=${error.message}`);
      }
    }

    return releases;
  }

  private isWithin(date: Date, window: ReleaseWindow): boolean {
    return date.getTime() >= window.start.getTime() && date.getTime() <= window.end.getTime();
  }

  private async delay() {
    await new Promise((resolve) => setTimeout(resolve, EXTERNAL_REQUEST_DELAY_MS));
  }
}
