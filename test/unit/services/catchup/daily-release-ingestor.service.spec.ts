import { CatchupMediaType, ReleaseEventType } from "@prisma/generated/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DailyReleaseIngestorService } from "@/modules/catchup/service/daily-release-ingestor.service";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";

const mockGameFindMany = vi.fn();
const mockGameUpdate = vi.fn();
const mockGetGameById = vi.fn();
const mockAuditRecord = vi.fn();

const mockDatabaseService = {
  game: {
    findMany: mockGameFindMany,
    update: mockGameUpdate,
  },
};

const mockIntegrationsService = {
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
    vi.clearAllMocks();
    vi.useFakeTimers();

    service = new DailyReleaseIngestorService(
      mockDatabaseService as any,
      mockIntegrationsService as any,
      mockCatchupFlagsService as any,
      mockCatchupAuditService as any,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
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
