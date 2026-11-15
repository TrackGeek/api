import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { HowLongToBeatService } from "@/shared/infra/integrations/how-long-to-beat.service";
import { ProtonDbService } from "@/shared/infra/integrations/protondb.service";

vi.mock("axios", () => ({ default: { get: vi.fn(), isAxiosError: vi.fn(() => false) } }));

const websites = [{ url: "https://store.steampowered.com/app/1903340/" }];
const response = {
  steamAppId: 1903340,
  hltbId: 152016,
  mainStory: 29.3,
  mainStoryWithExtras: 46.26,
  completionist: 68.94,
};
const cache = { get: vi.fn(), set: vi.fn() };
const service = () => new HowLongToBeatService(cache as unknown as CacheService, new ProtonDbService());

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  cache.get.mockResolvedValue(null);
  cache.set.mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

describe("HowLongToBeatService", () => {
  it("skips games without Steam links", async () => {
    expect(await service().getGameData([{ url: "https://example.com/app/1903340" }])).toBeNull();
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("retries uncached provider results and caches valid hours", async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: response });
    const result = service().getGameData(websites);
    await vi.runAllTimersAsync();
    expect(await result).toEqual({ hltbId: 152016, mainStory: 29.3, mainStoryWithExtras: 46.26, completionist: 68.94 });
    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(axios.get).toHaveBeenCalledWith("https://hltbapi.codepotatoes.de/steam/1903340", { timeout: 5000 });
    expect(cache.set).toHaveBeenCalledWith("how-long-to-beat:steam:1903340", { data: await result }, 86400);
  });

  it("bounds failures and expires missing data quickly so future requests retry", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("provider unavailable"));
    const result = service().getGameData(websites);
    await vi.runAllTimersAsync();
    expect(await result).toBeNull();
    expect(axios.get).toHaveBeenCalledTimes(3);
    expect(cache.set).toHaveBeenCalledWith("how-long-to-beat:steam:1903340", { data: null }, 60);
  });

  it("rejects mismatched Steam IDs and invalid durations", async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce({ data: { ...response, steamAppId: 100 } })
      .mockResolvedValue({ data: { ...response, mainStory: -1, mainStoryWithExtras: 0, completionist: "68" } });
    const result = service().getGameData(websites);
    await vi.runAllTimersAsync();
    expect(await result).toBeNull();
    expect(axios.get).toHaveBeenCalledTimes(3);
  });

  it("reuses cached results without querying provider", async () => {
    cache.get.mockResolvedValue({ data: { hltbId: 152016, mainStory: 29.3 } });
    expect(await service().getGameData(websites)).toEqual({ hltbId: 152016, mainStory: 29.3 });
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("deduplicates concurrent requests for same game", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: response });
    const instance = service();
    const results = await Promise.all([instance.getGameData(websites), instance.getGameData(websites)]);
    expect(results[0]).toEqual(results[1]);
    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});
