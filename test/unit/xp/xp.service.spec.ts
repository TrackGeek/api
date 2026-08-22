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
    it("concede o valor da tabela e devolve o level recalculado", async () => {
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

    it("o mesmo sourceKey duas vezes paga uma só", async () => {
      const sourceKey = `episode:Anime:${faker.string.uuid()}:1`;

      mockUserXpUpsert.mockResolvedValueOnce({ totalXp: 5, level: 1 });

      const first = await service.grantXp({ userId, reason: XpReason.EpisodeWatched, sourceKey });

      mockXpLedgerCreate.mockRejectedValueOnce(uniqueViolation);

      const second = await service.grantXp({ userId, reason: XpReason.EpisodeWatched, sourceKey });

      expect(first).not.toBeNull();
      expect(second).toBeNull();
    });

    it("o teto diário corta o excedente", async () => {
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

    it("teto esgotado não escreve no ledger", async () => {
      mockXpLedgerAggregate.mockResolvedValueOnce({ _sum: { amount: XP_RULES[XpReason.EpisodeWatched].dailyCap } });

      const result = await service.grantXp({
        userId,
        reason: XpReason.EpisodeWatched,
        sourceKey: `episode:Anime:${faker.string.uuid()}:3`,
      });

      expect(result).toBeNull();
      expect(mockXpLedgerCreate).not.toHaveBeenCalled();
    });

    it("skipDailyCap ignora o teto (backfill)", async () => {
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

    it("marca leveledUp quando o total cruza o limiar", async () => {
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
    it("conta ontem → hoje como sequência", async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      mockUserXpFindUnique.mockResolvedValueOnce({ lastActiveDate: yesterday, currentStreak: 3, longestStreak: 5 });

      const result = await service.touchStreak(userId);

      expect(result?.currentStreak).toBe(4);
      expect(result?.longestStreak).toBe(5);
    });

    it("reseta quando há buraco na sequência", async () => {
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      mockUserXpFindUnique.mockResolvedValueOnce({ lastActiveDate: lastWeek, currentStreak: 9, longestStreak: 9 });

      const result = await service.touchStreak(userId);

      expect(result?.currentStreak).toBe(1);
      expect(result?.longestStreak).toBe(9);
    });

    it("não conta duas vezes no mesmo dia", async () => {
      mockUserXpFindUnique.mockResolvedValueOnce({ lastActiveDate: new Date(), currentStreak: 2, longestStreak: 2 });

      const result = await service.touchStreak(userId);

      expect(result).toBeNull();
      expect(mockUserXpUpsert).not.toHaveBeenCalled();
    });

    it("o bônus cresce com a sequência e satura", async () => {
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
    it("concede só as medalhas dos marcos cruzados agora", async () => {
      mockMedalFindMany.mockResolvedValueOnce([{ id: faker.string.uuid(), name: "level-10" }]);
      mockUserMedalCreate.mockResolvedValueOnce({ id: faker.string.uuid() });

      const granted = await service.grantMilestoneMedals(userId, 9, 11);

      expect(granted).toHaveLength(1);
      expect(mockMedalFindMany).toHaveBeenCalledWith({ where: { name: { in: ["level-10"] } } });
    });

    it("não consulta nada quando nenhum marco foi cruzado", async () => {
      const granted = await service.grantMilestoneMedals(userId, 11, 12);

      expect(granted).toEqual([]);
      expect(mockMedalFindMany).not.toHaveBeenCalled();
    });

    it("quem já tem a medalha não recebe de novo", async () => {
      mockMedalFindMany.mockResolvedValueOnce([{ id: faker.string.uuid(), name: "level-25" }]);
      mockUserMedalCreate.mockRejectedValueOnce(uniqueViolation);

      const granted = await service.grantMilestoneMedals(userId, 24, 25);

      expect(granted).toEqual([]);
    });
  });
});
