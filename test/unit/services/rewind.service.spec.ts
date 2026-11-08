import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RewindController } from "@/modules/rewind/controller/rewind.controller";
import { REWIND_END, REWIND_TYPES } from "@/modules/rewind/rewind.constants";
import type { RewindProgressRow, RewindReviewRow } from "@/modules/rewind/rewind.queries";
import { summarizeRewind } from "@/modules/rewind/rewind.utils";
import { RewindService } from "@/modules/rewind/service/rewind.service";
import { CACHE_KEYS } from "@/shared/constants/cache";

function row(type: RewindProgressRow["type"], index = 0): RewindProgressRow {
  return {
    type,
    id: `${type}-${index}`,
    title: `Title ${index}`,
    image: null,
    slug: String(index),
    recordedAt: new Date(Date.UTC(2026, 8, index + 1)),
    completed: index % 2 === 0,
  };
}

function setup() {
  const database = { $queryRaw: vi.fn().mockResolvedValue([]), user: { count: vi.fn().mockResolvedValue(3) } };
  const cache = { get: vi.fn().mockResolvedValue(null), set: vi.fn() };
  const service = new RewindService(database as never, cache as never);
  return { database, cache, service };
}

afterEach(() => vi.useRealTimers());

describe("Replay summaries", () => {
  it("handles zero progress without inventing categories or a first title", () => {
    const summary = summarizeRewind([]);
    expect(summary.tracked).toBe(0);
    expect(summary.completed).toBe(0);
    expect(summary.categories).toEqual([]);
    expect(summary.first).toBeNull();
    expect(summary.monthly).toHaveLength(12);
    expect(summary.monthly.every((month) => month.count === 0)).toBe(true);
  });

  it("includes all six categories in narrative order", () => {
    expect(summarizeRewind(REWIND_TYPES.map((type) => row(type))).categories.map(({ type }) => type)).toEqual(
      REWIND_TYPES,
    );
  });

  it("keeps a category with just one progress entry", () => {
    expect(summarizeRewind([row("book")]).categories).toHaveLength(1);
  });

  it("ranks annual reviews by overall plus favorite bonus without changing progress totals", () => {
    const reviews: RewindReviewRow[] = Array.from({ length: 8 }, (_, index) => ({
      ...row("movie", index),
      overall: 5 - index * 0.2,
      favorite: index === 3,
    }));
    const summary = summarizeRewind(
      Array.from({ length: 8 }, (_, index) => row("movie", index)),
      reviews,
    );
    expect(summary.categories[0].titles.map(({ id }) => id)).toEqual([
      "movie-3",
      "movie-0",
      "movie-1",
      "movie-2",
      "movie-4",
    ]);
    expect(summary.reviewFavoriteBonus).toBe(1);
    expect(summary.categories[0].titles[0]).toMatchObject({ overall: 4.4, favorite: true });
    expect(summary.first?.id).toBe("movie-0");
    expect(summary.tracked).toBe(8);
    expect(summary.completed).toBe(4);
    expect(summary.monthly[8].count).toBe(8);
  });

  it("does not substitute unreviewed tracked titles for annual reviews", () => {
    expect(summarizeRewind([row("book")]).categories[0].titles).toEqual([]);
  });

  it("accepts annual reviews independently of the reviewed title's progress date", () => {
    const review = { ...row("movie", 10), overall: 5, favorite: false };
    const summary = summarizeRewind([row("movie")], [review]);
    expect(summary.tracked).toBe(1);
    expect(summary.categories[0].titles[0].id).toBe("movie-10");
  });

  it("breaks equal weighted scores by overall, then review date, then stable ID", () => {
    const reviews = [
      { ...row("movie", 1), overall: 4, favorite: true },
      { ...row("movie", 2), overall: 5, favorite: false },
      { ...row("movie", 3), overall: 5, favorite: false },
    ];
    expect(summarizeRewind([row("movie")], reviews).categories[0].titles.map(({ id }) => id)).toEqual([
      "movie-3",
      "movie-2",
      "movie-1",
    ]);
  });

  it("uses UTC months, including the first instant of the year", () => {
    const entry = { ...row("book"), recordedAt: new Date("2026-01-01T00:00:00Z") };
    expect(summarizeRewind([entry]).monthly[0].count).toBe(1);
  });
});

describe("Replay service and privacy", () => {
  it("requires authentication on the personal endpoint, not the aggregate endpoint", () => {
    expect(Reflect.getMetadata("__guards__", RewindController.prototype.getPersonal)).toContain(AuthGuard);
    expect(Reflect.getMetadata("__guards__", RewindController.prototype.getGlobal)).toBeUndefined();
    expect(Reflect.getMetadata("__headers__", RewindController.prototype.getPersonal)).toContainEqual({
      name: "Cache-Control",
      value: "private, no-store",
    });
  });

  it("binds the session user and marks a live 2026 response as preview", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-08T12:00:00Z"));
    const { database, service } = setup();
    database.$queryRaw.mockResolvedValueOnce([row("anime")]).mockResolvedValueOnce([]);
    const result = await service.getPersonal("my-private-user");
    expect(result.isPreview).toBe(true);
    expect(result.tracked).toBe(1);
    const query = database.$queryRaw.mock.calls[0][0];
    expect(query.values).toContain("my-private-user");
    expect(database.$queryRaw.mock.calls[1][0].values).toContain("my-private-user");
    expect(
      query.values
        .filter((value: unknown) => value instanceof Date)
        .every((value: Date) => value <= new Date("2026-11-08T12:00:00Z")),
    ).toBe(true);
  });

  it("caps the date range at the end of 2026 in later years", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2028-04-01T00:00:00Z"));
    const { database, service } = setup();
    expect((await service.getPersonal("me")).isPreview).toBe(false);
    expect(database.$queryRaw.mock.calls[0][0].values).toContainEqual(REWIND_END);
    expect(database.$queryRaw.mock.calls[0][0].values).not.toContainEqual(new Date("2028-04-01T00:00:00Z"));
  });

  it("aggregates globally without exposing user IDs or summing category people", async () => {
    const { database, cache, service } = setup();
    database.$queryRaw.mockResolvedValue([
      { type: "movie", tracked: 5, completed: 2, people: 2 },
      { type: "book", tracked: 4, completed: 1, people: 2 },
    ]);
    const result = await service.getGlobal();
    expect(result.tracked).toBe(9);
    expect(result.completed).toBe(3);
    expect(result.people).toBe(3);
    expect(cache.set).toHaveBeenCalledWith(CACHE_KEYS.REWIND_GLOBAL.prefix, result, 300);
    expect(JSON.stringify(result)).not.toContain("userId");
  });

  it("reuses cached global stats instead of querying all progress again", async () => {
    const { database, cache, service } = setup();
    cache.get.mockResolvedValue({ year: 2026, tracked: 10 });
    expect(await service.getGlobal()).toEqual({ year: 2026, tracked: 10 });
    expect(database.$queryRaw).not.toHaveBeenCalled();
  });
});
