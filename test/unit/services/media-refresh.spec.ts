import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnimeService } from "@/modules/anime/service/anime.service";
import { BookService } from "@/modules/book/service/book.service";
import { GameService } from "@/modules/game/service/game.service";
import { MangaService } from "@/modules/manga/service/manga.service";
import { MovieService } from "@/modules/movie/service/movie.service";
import { TVShowService } from "@/modules/tv-show/service/tv-show.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";

const now = new Date("2026-10-07T15:00:00Z");
const createdAt = new Date("2026-09-27T19:53:20Z");
const cases = [
  {
    model: "game",
    source: "igdb",
    sourceMethod: "getGameById",
    method: "refreshGame",
    id: "igdbId",
    Service: GameService,
  },
  {
    model: "book",
    source: "hardcover",
    sourceMethod: "getBookByHardcoverId",
    method: "refreshBook",
    id: "hardcoverId",
    Service: BookService,
  },
  {
    model: "movie",
    source: "tmdb",
    sourceMethod: "getMovieById",
    method: "refreshMovie",
    id: "id",
    Service: MovieService,
  },
  {
    model: "anime",
    source: "tenrai",
    sourceMethod: "getAnimeById",
    method: "refreshAnime",
    id: "malId",
    Service: AnimeService,
  },
  {
    model: "manga",
    source: "anilist",
    sourceMethod: "getMangaById",
    method: "refreshManga",
    id: "anilistId",
    Service: MangaService,
  },
  {
    model: "tvShow",
    source: "tmdb",
    sourceMethod: "getTVShowById",
    method: "refreshTVShow",
    id: "tmdbId",
    Service: TVShowService,
  },
];

function setup(testCase: (typeof cases)[number]) {
  let record = { id: "tracked-media", tmdbId: 10, createdAt, lastRefreshedAt: createdAt, episodes: {}, seasons: [] };
  const model = {
    findUnique: vi.fn(async () => record),
    findFirst: vi.fn(async () => ({ id: record.id })),
    update: vi.fn(async ({ data }) => {
      record = { ...record, ...data };
      return record;
    }),
  };
  const database = { [testCase.model]: model };
  const source = {
    [testCase.sourceMethod]: vi.fn().mockResolvedValue({ tmdbId: 10, anilistId: 10, title: "Fresh title" }),
    getTVShowSeasonsById: vi.fn().mockResolvedValue([]),
    getTVShowSeasonEpisdoesById: vi.fn().mockResolvedValue([]),
    getAnimeRelationsById: vi.fn().mockResolvedValue([]),
    getAnimeEpisodesById: vi.fn().mockResolvedValue({ items: [] }),
  };
  const integrations = { [testCase.source]: source };
  const service: any =
    testCase.model === "tvShow"
      ? new TVShowService({} as any, database as any, integrations as any, {} as any)
      : new (testCase.Service as any)(database, integrations, {});

  return { model, source, service, dto: { [testCase.id]: 10 } };
}

describe("Media refresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => vi.useRealTimers());

  it.each(cases)("refreshes $model and starts the cooldown only after saving fresh data", async (testCase) => {
    const { service, model, source, dto } = setup(testCase);

    await service[testCase.method](dto);

    expect(source[testCase.sourceMethod]).toHaveBeenCalledWith(10, true);
    expect(model.update.mock.calls[0][0].data).toMatchObject({ title: "Fresh title", lastRefreshedAt: now });
    await expect(service[testCase.method](dto)).rejects.toMatchObject({ status: 409 });
    expect(source[testCase.sourceMethod]).toHaveBeenCalledTimes(1);
  });

  it.each(cases)("does not advance $model refresh time when the source fails", async (testCase) => {
    const { service, model, source, dto } = setup(testCase);
    const error = new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    source[testCase.sourceMethod].mockRejectedValue(error);

    await expect(service[testCase.method](dto)).rejects.toBe(error);

    expect(model.update).not.toHaveBeenCalled();
    expect((await model.findUnique()).lastRefreshedAt).toEqual(createdAt);
  });

  it("fetches TV seasons with bounded concurrency and preserves every episode", async () => {
    const { service, model, source, dto } = setup(cases[5]);
    source.getTVShowSeasonsById.mockResolvedValue(Array.from({ length: 9 }, (_, seasonNumber) => ({ seasonNumber })));
    let active = 0;
    let peak = 0;
    source.getTVShowSeasonEpisdoesById.mockImplementation(async (_id, seasonNumber) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 100));
      active--;
      return [{ seasonNumber, episodeNumber: 1 }];
    });

    const refresh = service.refreshTVShow(dto);
    await vi.runAllTimersAsync();
    await refresh;

    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(4);
    expect(model.update.mock.calls[0][0].data.episodes).toEqual(
      Array.from({ length: 9 }, (_, seasonNumber) => ({ seasonNumber, episodeNumber: 1 })),
    );
    expect(source.getTVShowSeasonEpisdoesById.mock.calls.every((call) => call[2] === true)).toBe(true);
  });

  it("does not save an incomplete TV show when a season fails", async () => {
    const { service, model, source, dto } = setup(cases[5]);
    source.getTVShowSeasonsById.mockResolvedValue([{ seasonNumber: 1 }]);
    const error = new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
    source.getTVShowSeasonEpisdoesById.mockRejectedValue(error);

    await expect(service.refreshTVShow(dto)).rejects.toBe(error);

    expect(model.update).not.toHaveBeenCalled();
  });

  it("refreshes loaded anime episode pages instead of reusing cached episodes", async () => {
    const { service, model, source, dto } = setup(cases[3]);
    model.findUnique.mockResolvedValue({
      id: "tracked-media",
      tmdbId: 10,
      createdAt,
      lastRefreshedAt: createdAt,
      episodes: { "1": { items: ["stale"] } },
      seasons: [],
    });
    const refresh = service.refreshAnime(dto);
    await vi.runAllTimersAsync();
    await refresh;

    expect(source.getAnimeEpisodesById).toHaveBeenCalledWith({ malId: 10, page: 1 }, true);
    expect(model.update.mock.calls[0][0].data.episodes).toEqual({ "1": { items: [] } });
  });
});
