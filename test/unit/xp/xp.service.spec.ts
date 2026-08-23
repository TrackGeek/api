import { faker } from "@faker-js/faker";
import { ContentType, XpReason } from "@prisma/generated/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { XpService } from "@/modules/xp/service/xp.service";
import { xpForLevel } from "@/modules/xp/service/xp-level.util";
import { XP_RULES } from "@/shared/constants/xp";

const mockXpLedgerCreate = vi.fn();
const mockXpLedgerAggregate = vi.fn();
const mockUserXpUpsert = vi.fn();
const mockUserXpUpdate = vi.fn();
const mockUserXpFindUnique = vi.fn();
const mockUserContentXpUpsert = vi.fn();
const mockUserContentXpUpdate = vi.fn();
const mockMedalFindMany = vi.fn();
const mockUserMedalCreate = vi.fn();

const tx = {
  xpLedger: { create: mockXpLedgerCreate, aggregate: mockXpLedgerAggregate },
  userXp: { upsert: mockUserXpUpsert, update: mockUserXpUpdate },
  userContentXp: { upsert: mockUserContentXpUpsert, update: mockUserContentXpUpdate },
};

const mockDatabaseService = {
  $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  userXp: { findUnique: mockUserXpFindUnique, upsert: mockUserXpUpsert },
  medal: { findMany: mockMedalFindMany },
  userMedal: { create: mockUserMedalCreate },
};

const uniqueViolation = Object.assign(new Error("unique"), { code: "P2002" });

describe("XpService", () => {
  let service: XpService;
  let userId: string;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    userId = faker.string.uuid();
    service = new XpService(mockDatabaseService as any);

    mockXpLedgerAggregate.mockResolvedValue({ _sum: { amount: 0 } });
  });

  describe("grantXp", () => {
    it("concede the value of table and return the level recalculated", async () => {
      const amount = XP_RULES[XpReason.ReviewAdded].amount;

      mockUserXpUpsert.mockResolvedValueOnce({ totalXp: amount, level: 1 });
      mockUserContentXpUpsert.mockResolvedValueOnce({ xp: amount, level: 1 });

      const result = await service.grantXp({
        userId,
        reason: XpReason.ReviewAdded,
        sourceKey: `review:Anime:${faker.string.uuid()}`,
        contentType: ContentType.Anime,
      });

      expect(result?.amount).toBe(amount);
      expect(result?.totalXp).toBe(amount);
      expect(mockXpLedgerCreate).toHaveBeenCalledOnce();
    });

    it("the same sourceKey two times paid only one time", async () => {
      const sourceKey = `episode:Anime:${faker.string.uuid()}:1`;

      mockUserXpUpsert.mockResolvedValueOnce({ totalXp: 5, level: 1 });

      const first = await service.grantXp({ userId, reason: XpReason.EpisodeWatched, sourceKey });

      mockXpLedgerCreate.mockRejectedValueOnce(uniqueViolation);

      const second = await service.grantXp({ userId, reason: XpReason.EpisodeWatched, sourceKey });

      expect(first).not.toBeNull();
      expect(second).toBeNull();
    });

    it("the daily cap cuts the excess", async () => {
      const { amount, dailyCap } = XP_RULES[XpReason.EpisodeWatched];

      mockXpLedgerAggregate.mockResolvedValueOnce({ _sum: { amount: (dailyCap as number) - 2 } });
      mockUserXpUpsert.mockResolvedValueOnce({ totalXp: dailyCap as number, level: 1 });

      const result = await service.grantXp({
        userId,
        reason: XpReason.EpisodeWatched,
        sourceKey: `episode:Anime:${faker.string.uuid()}:2`,
      });

      expect(amount).toBeGreaterThan(2);
      expect(result?.amount).toBe(2);
    });

    it("the daily cap is exceeded and does not write to the ledger", async () => {
      mockXpLedgerAggregate.mockResolvedValueOnce({ _sum: { amount: XP_RULES[XpReason.EpisodeWatched].dailyCap } });

      const result = await service.grantXp({
        userId,
        reason: XpReason.EpisodeWatched,
        sourceKey: `episode:Anime:${faker.string.uuid()}:3`,
      });

      expect(result).toBeNull();
      expect(mockXpLedgerCreate).not.toHaveBeenCalled();
    });

    it("skipDailyCap ignores the daily cap (backfill)", async () => {
      mockUserXpUpsert.mockResolvedValueOnce({ totalXp: 5, level: 1 });

      const result = await service.grantXp({
        userId,
        reason: XpReason.EpisodeWatched,
        sourceKey: `episode:Anime:${faker.string.uuid()}:4`,
        skipDailyCap: true,
      });

      expect(result?.amount).toBe(XP_RULES[XpReason.EpisodeWatched].amount);
      expect(mockXpLedgerAggregate).not.toHaveBeenCalled();
    });

    it("marks leveledUp when the total crosses the threshold", async () => {
      const amount = XP_RULES[XpReason.ReviewAdded].amount;
      const totalXp = xpForLevel(4) + 1;

      mockUserXpUpsert.mockResolvedValueOnce({ totalXp, level: 3 });

      const result = await service.grantXp({
        userId,
        reason: XpReason.ReviewAdded,
        sourceKey: `review:Game:${faker.string.uuid()}`,
        amount,
      });

      expect(result?.leveledUp).toBe(true);
      expect(result?.level).toBe(4);
      expect(result?.previousLevel).toBeLessThan(4);
    });
  });

  describe("touchStreak", () => {
    it("counts yesterday → today as a sequence", async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      mockUserXpFindUnique.mockResolvedValueOnce({ lastActiveDate: yesterday, currentStreak: 3, longestStreak: 5 });

      const result = await service.touchStreak(userId);

      expect(result?.currentStreak).toBe(4);
      expect(result?.longestStreak).toBe(5);
    });

    it("resets when has a gap on sequence", async () => {
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      mockUserXpFindUnique.mockResolvedValueOnce({ lastActiveDate: lastWeek, currentStreak: 9, longestStreak: 9 });

      const result = await service.touchStreak(userId);

      expect(result?.currentStreak).toBe(1);
      expect(result?.longestStreak).toBe(9);
    });

    it("does not count twice on the same day", async () => {
      mockUserXpFindUnique.mockResolvedValueOnce({ lastActiveDate: new Date(), currentStreak: 2, longestStreak: 2 });

      const result = await service.touchStreak(userId);

      expect(result).toBeNull();
      expect(mockUserXpUpsert).not.toHaveBeenCalled();
    });

    it("the bonus grows with the sequence and saturates", async () => {
      const at3 = new Date(Date.now() - 24 * 60 * 60 * 1000);

      mockUserXpFindUnique.mockResolvedValueOnce({ lastActiveDate: at3, currentStreak: 2, longestStreak: 2 });
      const small = await service.touchStreak(userId);

      mockUserXpFindUnique.mockResolvedValueOnce({ lastActiveDate: at3, currentStreak: 40, longestStreak: 40 });
      const saturated = await service.touchStreak(userId);

      mockUserXpFindUnique.mockResolvedValueOnce({ lastActiveDate: at3, currentStreak: 400, longestStreak: 400 });
      const stillSaturated = await service.touchStreak(userId);

      expect(saturated?.bonusXp).toBeGreaterThan(small?.bonusXp as number);
      expect(stillSaturated?.bonusXp).toBe(saturated?.bonusXp);
    });
  });

  describe("grantMilestoneMedals", () => {
    it("grants only the badges from milestones marked now", async () => {
      mockMedalFindMany.mockResolvedValueOnce([{ id: faker.string.uuid(), name: "level-10" }]);
      mockUserMedalCreate.mockResolvedValueOnce({ id: faker.string.uuid() });

      const granted = await service.grantMilestoneMedals(userId, 9, 11);

      expect(granted).toHaveLength(1);
      expect(mockMedalFindMany).toHaveBeenCalledWith({ where: { name: { in: ["level-10"] } } });
    });

    it("does not query anything when no milestone has been crossed", async () => {
      const granted = await service.grantMilestoneMedals(userId, 11, 12);

      expect(granted).toEqual([]);
      expect(mockMedalFindMany).not.toHaveBeenCalled();
    });

    it("who have a badge doesn't receive again", async () => {
      mockMedalFindMany.mockResolvedValueOnce([{ id: faker.string.uuid(), name: "level-25" }]);
      mockUserMedalCreate.mockRejectedValueOnce(uniqueViolation);

      const granted = await service.grantMilestoneMedals(userId, 24, 25);

      expect(granted).toEqual([]);
    });
  });
});
