import { throwError } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { AnilistService } from "@/shared/infra/integrations/anilist.service";
import { HardcoverService } from "@/shared/infra/integrations/hardcover.service";
import { IGDBService } from "@/shared/infra/integrations/igdb.service";
import { TenraiService } from "@/shared/infra/integrations/tenrai.service";
import { TMDBService } from "@/shared/infra/integrations/tmdb.service";

const cases = [
  { Service: TMDBService, method: "getMovieById", args: [10] },
  { Service: TMDBService, method: "getTVShowById", args: [10] },
  { Service: TMDBService, method: "getTVShowSeasonsById", args: [10] },
  { Service: TMDBService, method: "getTVShowSeasonEpisdoesById", args: [10, 1] },
  { Service: IGDBService, method: "getGameById", args: [10] },
  { Service: HardcoverService, method: "getBookByHardcoverId", args: [10] },
  { Service: TenraiService, method: "getAnimeById", args: [10] },
  { Service: TenraiService, method: "getAnimeEpisodesById", args: [{ malId: 10, page: 1 }] },
  { Service: AnilistService, method: "getMangaById", args: [10] },
];

describe("Refresh cache bypass", () => {
  it.each(cases)("$method uses the source even when stale cached data exists", async ({ Service, method, args }) => {
    const cached = { title: "Stale cached title" };
    const cache = { get: vi.fn().mockResolvedValue(cached), set: vi.fn() };
    const unavailable = throwError(() => ({ code: "ECONNABORTED", message: "timeout", response: { status: 503 } }));
    const http = { get: vi.fn().mockReturnValue(unavailable), post: vi.fn().mockReturnValue(unavailable) };
    const config = { get: vi.fn().mockReturnValue("test-key") };
    const service: any =
      Service === AnilistService || Service === TenraiService
        ? new (Service as any)(http, cache)
        : new (Service as any)(http, config, cache);

    if (Service === IGDBService) {
      vi.spyOn(service, "getAccessToken").mockResolvedValue("test-token");
    }

    await expect(service[method](...args)).resolves.toEqual(cached);
    expect(http.get).not.toHaveBeenCalled();
    expect(http.post).not.toHaveBeenCalled();
    cache.get.mockClear();

    await expect(service[method](...args, true)).rejects.toBeInstanceOf(AppException);

    expect(cache.get).not.toHaveBeenCalled();
    expect(http.get.mock.calls.length + http.post.mock.calls.length).toBeGreaterThan(0);
    expect(cache.set).not.toHaveBeenCalled();
  });
});
