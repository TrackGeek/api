import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProtonDbService } from "@/shared/infra/integrations/protondb.service";

const websites = [{ url: "https://store.steampowered.com/app/220/HalfLife_2/" }];

describe("ProtonDbService", () => {
  afterEach(() => vi.restoreAllMocks());

  it("skips external requests without a Steam app ID", async () => {
    const get = vi.spyOn(axios, "get");
    expect(await new ProtonDbService().getGameData([{ url: "https://example.com/app/220" }])).toMatchObject({
      steamAppId: null,
    });
    expect(get).not.toHaveBeenCalled();
  });

  it.each([3, 1])("persists summary and Deck category %i", async (category) => {
    vi.spyOn(axios, "get")
      .mockResolvedValueOnce({ data: { tier: "platinum", score: 0.91 } })
      .mockResolvedValueOnce({ data: { success: 1, results: { resolved_category: category } } });
    expect(await new ProtonDbService().getGameData(websites)).toMatchObject({
      steamAppId: "220",
      protonDbTier: "platinum",
      protonDbScore: 0.91,
      steamDeckCategory: category,
    });
  });

  it("preserves summary on failure while updating Deck", async () => {
    vi.spyOn(axios, "get")
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({ data: { success: 1, results: { resolved_category: 2 } } });
    const result = await new ProtonDbService().getGameData(websites);
    expect(result.protonDbTier).toBeUndefined();
    expect(result.protonDbScore).toBeUndefined();
    expect(result.steamDeckCategory).toBe(2);
    expect(result.protonDbUpdatedAt).toBeInstanceOf(Date);
  });
});
