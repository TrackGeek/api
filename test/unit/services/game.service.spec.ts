import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameService } from "@/modules/game/service/game.service";

const database = {
  game: { findUnique: vi.fn() },
  gameReview: { aggregate: vi.fn() },
  gameProgress: { groupBy: vi.fn() },
};
const hltb = { getGameData: vi.fn() };
const service = new GameService(database as any, {} as any, {} as any, hltb as any);

beforeEach(() => vi.clearAllMocks());

describe("GameService HowLongToBeat", () => {
  it("serves main detail without waiting for HowLongToBeat", async () => {
    database.game.findUnique.mockResolvedValue({ id: "game", igdbId: 999, protonDbUpdatedAt: new Date() });
    database.gameReview.aggregate.mockResolvedValue({ _avg: { overall: null } });
    database.gameProgress.groupBy.mockResolvedValue([]);
    const game = await service.getGameByIgdbId(999);
    expect(game.id).toBe("game");
    expect(hltb.getGameData).not.toHaveBeenCalled();
  });

  it("uses only stored websites to resolve Steam identity", async () => {
    const websites = [{ url: "https://store.steampowered.com/app/1903340" }];
    database.game.findUnique.mockResolvedValue({ websites });
    hltb.getGameData.mockResolvedValue({ hltbId: 152016, mainStory: 29.3 });
    expect(await service.getHowLongToBeat(999)).toEqual({ hltbId: 152016, mainStory: 29.3 });
    expect(database.game.findUnique).toHaveBeenCalledWith({ where: { igdbId: 999 }, select: { websites: true } });
    expect(hltb.getGameData).toHaveBeenCalledWith(websites);
  });

  it("does not query provider for unknown games", async () => {
    database.game.findUnique.mockResolvedValue(null);
    await expect(service.getHowLongToBeat(999)).rejects.toMatchObject({ status: 404 });
    expect(hltb.getGameData).not.toHaveBeenCalled();
  });
});
