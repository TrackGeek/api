import { faker } from "@faker-js/faker";
import { ContentType, MissionMetric, MissionTier, XpReason } from "@prisma/generated/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MissionService } from "@/modules/mission/service/mission.service";

const mockMissionFindMany = vi.fn();
const mockUserMissionUpsert = vi.fn();
const mockUserMissionUpdate = vi.fn();
const mockXpLedgerFindMany = vi.fn();
const mockUserXpFindUnique = vi.fn();
const mockUserContentXpFindUnique = vi.fn();

const mockDatabaseService = {
  mission: { findMany: mockMissionFindMany },
  userMission: { upsert: mockUserMissionUpsert, update: mockUserMissionUpdate },
  xpLedger: { findMany: mockXpLedgerFindMany },
  userXp: { findUnique: mockUserXpFindUnique },
  userContentXp: { findUnique: mockUserContentXpFindUnique },
};

function buildMission(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: faker.string.uuid(),
    key: faker.helpers.slugify(faker.word.words(2)).toLowerCase(),
    metric: MissionMetric.EpisodesWatched,
    contentType: null,
    target: 10,
    xpReward: 50,
    coinReward: 5,
    cosmeticKey: null,
    medalId: null,
    tier: MissionTier.Bronze,
    position: 0,
    hidden: false,
    active: true,
    ...overrides,
  };
}

describe("MissionService", () => {
  let service: MissionService;
  let userId: string;

  beforeEach(() => {
    vi.resetAllMocks();

    userId = faker.string.uuid();
    service = new MissionService(mockDatabaseService as any);

    mockMissionFindMany.mockResolvedValue([]);
  });

  describe("advanceForXpReason", () => {
    it("increment the mission of counter and doesn't close before the target", async () => {
      const mission = buildMission({ target: 10 });

      mockMissionFindMany.mockResolvedValueOnce([mission]);
      mockUserMissionUpsert.mockResolvedValueOnce({ id: faker.string.uuid(), progress: 3, completedAt: null });

      const completed = await service.advanceForXpReason(userId, XpReason.EpisodeWatched, ContentType.Anime);

      expect(completed).toEqual([]);
      expect(mockUserMissionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { progress: { increment: 1 } } }),
      );
    });

    it("close the mission when the target is beated", async () => {
      const mission = buildMission({ target: 10 });
      const userMissionId = faker.string.uuid();

      mockMissionFindMany.mockResolvedValueOnce([mission]);
      mockUserMissionUpsert.mockResolvedValueOnce({ id: userMissionId, progress: 10, completedAt: null });
      mockUserMissionUpdate.mockResolvedValueOnce({ id: userMissionId, progress: 10, completedAt: new Date() });

      const completed = await service.advanceForXpReason(userId, XpReason.EpisodeWatched, ContentType.Anime);

      expect(completed).toHaveLength(1);
      expect(completed[0]?.mission.id).toBe(mission.id);
    });

    it("mission already completed doesn't close again", async () => {
      mockMissionFindMany.mockResolvedValueOnce([buildMission({ target: 10 })]);
      mockUserMissionUpsert.mockResolvedValueOnce({ id: faker.string.uuid(), progress: 20, completedAt: new Date() });

      const completed = await service.advanceForXpReason(userId, XpReason.EpisodeWatched, ContentType.Anime);

      expect(completed).toEqual([]);
      expect(mockUserMissionUpdate).not.toHaveBeenCalled();
    });

    it("event without contentType just feed global missions", async () => {
      await service.advanceForXpReason(userId, XpReason.Followed, null);

      expect(mockMissionFindMany).toHaveBeenCalledWith({
        where: { metric: MissionMetric.UsersFollowed, active: true, contentType: null },
      });
    });

    it("event of a media feeds the global mission and the one for that media", async () => {
      await service.advanceForXpReason(userId, XpReason.EpisodeWatched, ContentType.Anime);

      expect(mockMissionFindMany).toHaveBeenCalledWith({
        where: {
          metric: MissionMetric.EpisodesWatched,
          active: true,
          OR: [{ contentType: null }, { contentType: ContentType.Anime }],
        },
      });
    });

    it("reason without metric mapped doesn't touch any mission", async () => {
      const completed = await service.advanceForXpReason(userId, XpReason.MissionCompleted, null);

      expect(completed).toEqual([]);
      expect(mockMissionFindMany).not.toHaveBeenCalled();
    });

    it("ContentTypesReviewed close with 6 content types", async () => {
      const mission = buildMission({ metric: MissionMetric.ContentTypesReviewed, target: 6 });
      const userMissionId = faker.string.uuid();

      mockMissionFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([mission]);
      mockXpLedgerFindMany.mockResolvedValueOnce(
        [
          ContentType.Anime,
          ContentType.Manga,
          ContentType.TVShow,
          ContentType.Movie,
          ContentType.Game,
          ContentType.Book,
        ].map((contentType) => ({ contentType })),
      );
      mockUserMissionUpsert.mockResolvedValueOnce({ id: userMissionId, progress: 6, completedAt: null });
      mockUserMissionUpdate.mockResolvedValueOnce({ id: userMissionId, progress: 6, completedAt: new Date() });

      const completed = await service.advanceForXpReason(userId, XpReason.ReviewAdded, ContentType.Book);

      expect(completed).toHaveLength(1);
      expect(mockUserMissionUpsert).toHaveBeenCalledWith(expect.objectContaining({ update: { progress: 6 } }));
    });

    it("StreakReached fit the best streak, not the actual", async () => {
      mockMissionFindMany.mockResolvedValueOnce([buildMission({ metric: MissionMetric.StreakReached, target: 30 })]);
      mockUserXpFindUnique.mockResolvedValueOnce({ currentStreak: 2, longestStreak: 12 });
      mockUserMissionUpsert.mockResolvedValueOnce({ id: faker.string.uuid(), progress: 12, completedAt: null });

      await service.advanceForXpReason(userId, XpReason.StreakBonus, null);

      expect(mockUserMissionUpsert).toHaveBeenCalledWith(expect.objectContaining({ update: { progress: 12 } }));
    });
  });

  describe("advanceLevelReached", () => {
    it("fit the global level when the mission doesn't have contentType", async () => {
      mockMissionFindMany.mockResolvedValueOnce([buildMission({ metric: MissionMetric.LevelReached, target: 10 })]);
      mockUserXpFindUnique.mockResolvedValueOnce({ level: 7 });
      mockUserMissionUpsert.mockResolvedValueOnce({ id: faker.string.uuid(), progress: 7, completedAt: null });

      const completed = await service.advanceLevelReached(userId);

      expect(completed).toEqual([]);
      expect(mockUserMissionUpsert).toHaveBeenCalledWith(expect.objectContaining({ update: { progress: 7 } }));
    });

    it("fit media level when the mission has contentType", async () => {
      mockMissionFindMany.mockResolvedValueOnce([
        buildMission({ metric: MissionMetric.LevelReached, target: 5, contentType: ContentType.Game }),
      ]);
      mockUserContentXpFindUnique.mockResolvedValueOnce({ xp: 5000 });
      mockUserMissionUpsert.mockResolvedValueOnce({ id: faker.string.uuid(), progress: 1, completedAt: null });

      await service.advanceLevelReached(userId);

      expect(mockUserContentXpFindUnique).toHaveBeenCalled();
      expect(mockUserXpFindUnique).not.toHaveBeenCalled();
    });
  });
});
