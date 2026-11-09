import { Prisma } from "@prisma/generated/client";
import { CatchupMediaType, ReleaseEventType } from "@prisma/generated/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnimeService } from "@/modules/anime/service/anime.service";
import { DailyReleaseIngestorService } from "@/modules/catchup/service/daily-release-ingestor.service";
import { TVShowService } from "@/modules/tv-show/service/tv-show.service";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";

const mockGameFindMany = vi.fn();
const mockGameUpdate = vi.fn();
const mockGetGameById = vi.fn();
const mockAuditRecord = vi.fn();
const mockAnimeFindMany = vi.fn();
const mockAnimeUpdate = vi.fn();
const mockGetAnimeById = vi.fn();

const mockTvFindMany = vi.fn();
const mockTvUpdate = vi.fn();
const mockGetTVShowById = vi.fn();
const mockCacheDelete = vi.fn();

const mockDatabaseService = {
  tvShow: { findMany: mockTvFindMany, update: mockTvUpdate },
  anime: {
    findMany: mockAnimeFindMany,
    update: mockAnimeUpdate,
  },
  game: {
    findMany: mockGameFindMany,
    update: mockGameUpdate,
  },
};

const mockIntegrationsService = {
  tmdb: { getTVShowById: mockGetTVShowById },
  tenrai: {
    getAnimeById: mockGetAnimeById,
  },
  igdb: {
    getGameById: mockGetGameById,
  },
};

const mockCatchupFlagsService = {
  flags: {
    autoReopenCompletedOnNewContent: true,
    notifyPlanToWatchReleases: false,
    notifyOnHoldUsers: false,
    ignoreSpecialContentForReopen: false,
    gamesReleaseNotificationsEnabled: true,
    mangaChapterNotificationsEnabled: false,
    animeEpisodeNotificationsEnabled: false,
    tvShowEpisodeNotificationsEnabled: false,
    sequelAddedNotificationsEnabled: false,
  },
  timeZone: "UTC",
  toleranceDays: 1,
  batchSize: 200,
};

const mockCatchupAuditService = {
  record: mockAuditRecord,
};

const runDate = new Date("2026-08-29T12:00:00.000Z");

async function fetchReleases(service: DailyReleaseIngestorService) {
  const promise = service.fetchReleases(runDate);

  await vi.runAllTimersAsync();

  return promise;
}

describe("DailyReleaseIngestorService", () => {
  let service: DailyReleaseIngestorService;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(runDate);
    mockCatchupFlagsService.flags.tvShowEpisodeNotificationsEnabled = false;
    mockCatchupFlagsService.flags.animeEpisodeNotificationsEnabled = false;
    mockCatchupFlagsService.flags.gamesReleaseNotificationsEnabled = true;

    service = new DailyReleaseIngestorService(
      mockDatabaseService as any,
      mockIntegrationsService as any,
      mockCatchupFlagsService as any,
      mockCatchupAuditService as any,
      { delete: mockCacheDelete } as any,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("ingestAnimeEpisodes", () => {
    beforeEach(() => {
      mockCatchupFlagsService.flags.animeEpisodeNotificationsEnabled = true;
      mockCatchupFlagsService.flags.gamesReleaseNotificationsEnabled = false;
      mockAnimeFindMany.mockResolvedValue([
        { id: "beerus", malId: 63367, title: "Dragon Ball Super: Beerus", numberOfEpisodes: null },
      ]);
    });

    it("updates the refresh timestamp when fresh source data changes", async () => {
      const stale = { title: "Dragon Ball Super: Beerus", status: "Not yet aired", numberOfEpisodes: null };
      const fresh = { ...stale, status: "Currently Airing", numberOfEpisodes: 1, type: "TV" };
      mockGetAnimeById.mockImplementation(async (_malId, forceRefresh) => (forceRefresh ? fresh : stale));

      const releases = await fetchReleases(service);

      expect(mockAnimeUpdate).toHaveBeenCalledWith({
        where: { malId: 63367 },
        data: {
          ...fresh,
          lastRefreshedAt: runDate,
          episodes: Prisma.JsonNull,
          lastReleaseCheckedAt: runDate,
          nextReleaseCheckAt: new Date("2026-08-30T00:00:00Z"),
        },
      });
      expect(releases).toEqual([
        expect.objectContaining({
          mediaType: CatchupMediaType.Anime,
          eventType: ReleaseEventType.NewEpisodeReleased,
          externalId: 63367,
          unitNumber: 1,
        }),
      ]);
    });

    it("keeps upcoming titles on a weekly schedule without discarding episodes when nothing changed", async () => {
      mockAnimeFindMany.mockResolvedValueOnce([
        {
          id: "beerus",
          malId: 63367,
          title: "Beerus",
          status: "Not yet aired",
          numberOfEpisodes: null,
          aired: { from: "2026-10-11" },
        },
      ]);
      mockGetAnimeById.mockResolvedValueOnce({
        status: "Not yet aired",
        numberOfEpisodes: null,
        aired: { from: "2026-10-11" },
      });

      expect(await fetchReleases(service)).toEqual([]);
      const data = mockAnimeUpdate.mock.calls[0][0].data;
      expect(data.nextReleaseCheckAt).toEqual(new Date("2026-09-05T00:00:00Z"));
      expect(data).not.toHaveProperty("lastRefreshedAt");
      expect(data).not.toHaveProperty("episodes");
      expect(mockCacheDelete).not.toHaveBeenCalled();
    });

    it("invalidates all loaded pages and page one for ongoing anime with unknown episode counts", async () => {
      mockAnimeFindMany.mockResolvedValueOnce([
        { malId: 63367, status: "Currently Airing", numberOfEpisodes: null, episodes: { "2": { items: [] } } },
      ]);
      mockGetAnimeById.mockResolvedValueOnce({ status: "Currently Airing", numberOfEpisodes: null });

      await fetchReleases(service);

      for (const page of [1, 2]) {
        expect(mockCacheDelete).toHaveBeenCalledWith(
          CACHE_KEYS.TENRAI_ANIME_EPISODES_BY_ID.prefix({ malId: 63367, page }),
        );
      }
      expect(mockAnimeUpdate.mock.calls[0][0].data.episodes).toBe(Prisma.JsonNull);
    });

    it("does not advance the refresh time when the anime source fails", async () => {
      mockGetAnimeById.mockRejectedValueOnce(new Error("tenrai down"));

      const releases = await fetchReleases(service);

      expect(mockAnimeUpdate).not.toHaveBeenCalled();
      expect(releases).toEqual([]);
    });
  });

  describe("ingestTvShowEpisodes", () => {
    beforeEach(() => {
      mockCatchupFlagsService.flags.tvShowEpisodeNotificationsEnabled = true;
      mockCatchupFlagsService.flags.gamesReleaseNotificationsEnabled = false;
      mockTvFindMany.mockResolvedValue([
        { id: "alien", tmdbId: 157239, name: "Alien: Earth", lastEpisodeToAir: { seasonNumber: 1, episodeNumber: 8 } },
      ]);
    });

    it("checks Alien weekly without renewing the cooldown or clearing episodes during a hiatus", async () => {
      mockTvFindMany.mockResolvedValueOnce([
        {
          id: "alien",
          tmdbId: 157239,
          name: "Alien: Earth",
          status: "Returning Series",
          inProduction: true,
          nextEpisodeToAir: null,
          lastEpisodeToAir: { seasonNumber: 1, episodeNumber: 8, airDate: "2025-09-23" },
        },
      ]);
      mockGetTVShowById.mockResolvedValueOnce({
        name: "Alien: Earth",
        status: "Returning Series",
        inProduction: true,
        nextEpisodeToAir: null,
        lastEpisodeToAir: { seasonNumber: 1, episodeNumber: 8, airDate: "2025-09-23" },
      });

      expect(await fetchReleases(service)).toEqual([]);
      expect(mockGetTVShowById).toHaveBeenCalledWith(157239, true);
      const data = mockTvUpdate.mock.calls[0][0].data;
      expect(data.nextReleaseCheckAt).toEqual(new Date("2026-09-05T00:00:00Z"));
      expect(data).not.toHaveProperty("lastRefreshedAt");
      expect(data).not.toHaveProperty("episodes");
      expect(mockCacheDelete).not.toHaveBeenCalled();
      expect(mockTvFindMany.mock.calls[0][0].where.AND[1]).toEqual({
        OR: [{ nextReleaseCheckAt: null }, { nextReleaseCheckAt: { lte: runDate } }],
      });
    });

    it("detects a returning show, clears stored and Redis episodes, and switches to daily checks", async () => {
      mockTvFindMany.mockResolvedValueOnce([
        {
          id: "alien",
          tmdbId: 157239,
          episodes: [{ seasonNumber: 1 }],
          lastEpisodeToAir: { seasonNumber: 1, episodeNumber: 8 },
        },
      ]);
      mockGetTVShowById.mockResolvedValueOnce({
        name: "Alien: Earth",
        lastEpisodeToAir: { seasonNumber: 2, episodeNumber: 1, airDate: runDate },
      });

      const releases = await fetchReleases(service);

      expect(releases).toEqual([expect.objectContaining({ containerNumber: 2, unitNumber: 1 })]);
      expect(mockTvUpdate.mock.calls[0][0].data).toMatchObject({
        episodes: Prisma.JsonNull,
        seasons: Prisma.JsonNull,
        nextReleaseCheckAt: new Date("2026-08-30T00:00:00Z"),
      });
      expect(mockTvUpdate.mock.calls[0][0].data.lastRefreshedAt).toEqual(runDate);
      for (const season of [1, 2]) {
        expect(mockCacheDelete).toHaveBeenCalledWith(
          CACHE_KEYS.TMDB_TV_SHOW_SEASON_EPISODES_BY_ID.prefix(157239, season),
        );
      }
      expect(mockCacheDelete).toHaveBeenCalledWith(CACHE_KEYS.TMDB_TV_SHOW_SEASONS_BY_ID.prefix(157239));
    });

    it("does not change scheduling, cooldown, or episode caches when the source fails", async () => {
      mockGetTVShowById.mockRejectedValueOnce(new Error("tmdb down"));

      expect(await fetchReleases(service)).toEqual([]);
      expect(mockTvUpdate).not.toHaveBeenCalled();
      expect(mockCacheDelete).not.toHaveBeenCalled();
    });

    it("detects episodes released earlier in the week after a hiatus", async () => {
      mockTvFindMany.mockResolvedValueOnce([
        { id: "alien", tmdbId: 157239, lastReleaseCheckedAt: new Date("2026-08-22T04:00:00Z") },
      ]);
      mockGetTVShowById.mockResolvedValueOnce({
        lastEpisodeToAir: { seasonNumber: 2, episodeNumber: 1, airDate: new Date("2026-08-25") },
      });

      expect(await fetchReleases(service)).toEqual([
        expect.objectContaining({ externalId: 157239, containerNumber: 2, unitNumber: 1 }),
      ]);
    });
  });

  it.each(["anime", "tvShow"] as const)(
    "allows manual %s refresh after an automatic check without content changes",
    async (model) => {
      mockCatchupFlagsService.flags.gamesReleaseNotificationsEnabled = false;
      mockCatchupFlagsService.flags.animeEpisodeNotificationsEnabled = model === "anime";
      mockCatchupFlagsService.flags.tvShowEpisodeNotificationsEnabled = model === "tvShow";
      const record = {
        malId: 63367,
        tmdbId: 157239,
        status: "Not yet aired",
        numberOfEpisodes: null,
        lastRefreshedAt: new Date("2026-08-01"),
        episodes: {},
      };
      const findMany = model === "anime" ? mockAnimeFindMany : mockTvFindMany;
      const update = model === "anime" ? mockAnimeUpdate : mockTvUpdate;
      findMany.mockResolvedValueOnce([record]);
      update.mockImplementation(async ({ data }) => Object.assign(record, data));
      mockGetAnimeById.mockResolvedValue({ status: "Not yet aired", numberOfEpisodes: null });
      mockGetTVShowById.mockResolvedValue({ lastEpisodeToAir: null });
      await fetchReleases(service);
      expect(record.lastRefreshedAt).toEqual(new Date("2026-08-01"));

      const database = { [model]: { findUnique: vi.fn(async () => record), update } };
      if (model === "anime") {
        const integrations = {
          tenrai: { getAnimeById: mockGetAnimeById, getAnimeRelationsById: vi.fn().mockResolvedValue([]) },
        };
        await new AnimeService(database as any, integrations as any, {} as any).refreshAnime({ malId: 63367 });
      } else {
        const integrations = {
          tmdb: { getTVShowById: mockGetTVShowById, getTVShowSeasonsById: vi.fn().mockResolvedValue([]) },
        };
        await new TVShowService({} as any, database as any, integrations as any, {} as any).refreshTVShow({
          tmdbId: 157239,
        });
      }
      expect(record.lastRefreshedAt).toEqual(new Date());
    },
  );

  describe.each(["anime", "tvShow"] as const)("%s refresh timestamps", (model) => {
    const previousRefresh = new Date("2026-08-01");

    beforeEach(() => {
      mockCatchupFlagsService.flags.gamesReleaseNotificationsEnabled = false;
      mockCatchupFlagsService.flags.animeEpisodeNotificationsEnabled = model === "anime";
      mockCatchupFlagsService.flags.tvShowEpisodeNotificationsEnabled = model === "tvShow";
    });

    it.each([
      { changed: {}, expectedChange: false },
      { changed: { popularity: 200, rank: 10, malReviewScore: 9, tmdbReviewScore: 9 }, expectedChange: false },
      { changed: { status: "Finished Airing" }, expectedChange: true },
      { changed: { numberOfEpisodes: 9 }, expectedChange: true },
      { changed: { synopsis: "New synopsis" }, expectedChange: true },
    ])("updates lastRefreshedAt only for meaningful changes: $changed", async ({ changed, expectedChange }) => {
      const stored = {
        id: "media",
        malId: 63367,
        tmdbId: 157239,
        title: "Title",
        name: "Name",
        status: "Currently Airing",
        numberOfEpisodes: 8,
        popularity: 100,
        rank: 1,
        malReviewScore: 8,
        tmdbReviewScore: 8,
        synopsis: "Synopsis",
        lastEpisodeToAir: null,
        lastRefreshedAt: previousRefresh,
      };
      const incoming = {
        title: "Title",
        name: "Name",
        status: "Currently Airing",
        numberOfEpisodes: 8,
        popularity: 100,
        rank: 1,
        malReviewScore: 8,
        tmdbReviewScore: 8,
        synopsis: "Synopsis",
        lastEpisodeToAir: null,
        ...changed,
      };
      const findMany = model === "anime" ? mockAnimeFindMany : mockTvFindMany;
      const update = model === "anime" ? mockAnimeUpdate : mockTvUpdate;
      const getById = model === "anime" ? mockGetAnimeById : mockGetTVShowById;
      findMany.mockResolvedValue([stored]);
      getById.mockResolvedValue(incoming);
      update.mockImplementation(async ({ data }) => Object.assign(stored, data));

      await fetchReleases(service);

      expect(stored.lastRefreshedAt).toEqual(expectedChange ? runDate : previousRefresh);
      expect(update.mock.calls[0][0].data.lastReleaseCheckedAt).toEqual(runDate);

      const refreshedAt = stored.lastRefreshedAt;
      const nextCheck = new Date("2026-09-05T04:00:00Z");
      vi.setSystemTime(nextCheck);
      await fetchReleases(service);

      expect(stored.lastRefreshedAt).toEqual(refreshedAt);
      expect(update.mock.calls[1][0].data.lastReleaseCheckedAt).toEqual(nextCheck);
    });
  });

  describe("ingestGameReleases", () => {
    it("should refresh every released game found in the database", async () => {
      mockGameFindMany.mockResolvedValueOnce([
        {
          id: "game-1",
          igdbId: 1,
          name: "Old Name",
          firstReleaseDate: runDate,
          gameStatus: "Alpha",
          lastRefreshedAt: new Date(runDate.getTime() - REFRESH_INTERVAL_MS - 1000),
        },
      ]);
      mockGetGameById.mockResolvedValueOnce({ name: "New Name", gameStatus: "Released" });
      mockGameUpdate.mockResolvedValueOnce({ name: "New Name", firstReleaseDate: runDate, gameStatus: "Released" });

      const releases = await fetchReleases(service);

      expect(mockGetGameById).toHaveBeenCalledWith(1);
      expect(mockGameUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { igdbId: 1 },
          data: expect.objectContaining({ name: "New Name", lastRefreshedAt: expect.any(Date) }),
        }),
      );
      expect(releases).toEqual([
        expect.objectContaining({
          mediaType: CatchupMediaType.Game,
          eventType: ReleaseEventType.NewGameReleased,
          externalId: 1,
          title: "New Name",
          kind: "Released",
        }),
      ]);
    });

    it("should skip games refreshed within the refresh interval", async () => {
      mockGameFindMany.mockResolvedValueOnce([
        {
          id: "game-1",
          igdbId: 1,
          name: "Game",
          firstReleaseDate: runDate,
          gameStatus: "Released",
          lastRefreshedAt: runDate,
        },
      ]);

      const releases = await fetchReleases(service);

      expect(mockGetGameById).not.toHaveBeenCalled();
      expect(mockGameUpdate).not.toHaveBeenCalled();
      expect(releases).toHaveLength(1);
    });

    it("should still emit the release when the refresh fails", async () => {
      mockGameFindMany.mockResolvedValueOnce([
        {
          id: "game-1",
          igdbId: 1,
          name: "Game",
          firstReleaseDate: runDate,
          gameStatus: "Alpha",
          lastRefreshedAt: new Date(0),
        },
      ]);
      mockGetGameById.mockRejectedValueOnce(new Error("igdb down"));

      const releases = await fetchReleases(service);

      expect(releases).toEqual([expect.objectContaining({ title: "Game", kind: "Alpha" })]);
    });
  });
});
