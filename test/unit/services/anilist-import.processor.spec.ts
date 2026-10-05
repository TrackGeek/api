import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnilistImportProcessor } from "@/modules/import/anilist-import.processor";
import { emptyAnilistReport } from "@/modules/import/anilist-job.service";
import { mapAnilistEntry } from "@/modules/import/anilist-mapping";

const mapped = (type: "ANIME" | "MANGA" = "ANIME") => {
  const result = mapAnilistEntry(
    {
      id: 1,
      mediaId: 10,
      status: "COMPLETED",
      progress: 2,
      repeat: 3,
      score: 3,
      notes: "Original",
      startedAt: { year: 2020, month: 2, day: 3 },
      completedAt: { year: 2021, month: 4, day: 5 },
      media: { id: 10, idMal: 20, type, title: { romaji: "Title" } },
    },
    "POINT_3",
  );
  if (result.state !== "ready") throw new Error("Invalid fixture");
  return result.entry;
};

describe("AnilistImportProcessor", () => {
  const db = {
    anime: { findUnique: vi.fn() },
    manga: { findUnique: vi.fn() },
    animeProgress: { findUnique: vi.fn() },
    mangaProgress: { findUnique: vi.fn() },
    animeEpisodeWatch: { findMany: vi.fn() },
    animeReview: { findUnique: vi.fn() },
    mangaReview: { findUnique: vi.fn() },
    list: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
    listItem: { findFirst: vi.fn() },
  };
  const anime = { getAnimeByMalId: vi.fn() };
  const manga = { getMangaByAnilistId: vi.fn() };
  const animeProgress = { createOrUpdateAnimeProgress: vi.fn() };
  const mangaProgress = { createOrUpdateMangaProgress: vi.fn() };
  const episodes = { createOrUpdateAnimeEpisodeWatch: vi.fn() };
  const animeReviews = { createAnimeReview: vi.fn(), updateAnimeReview: vi.fn() };
  const mangaReviews = { createMangaReview: vi.fn(), updateMangaReview: vi.fn() };
  const lists = { createList: vi.fn(), addItemToList: vi.fn() };
  const processor = new AnilistImportProcessor(
    db as any,
    anime as any,
    manga as any,
    animeProgress as any,
    mangaProgress as any,
    episodes as any,
    animeReviews as any,
    mangaReviews as any,
    lists as any,
  );

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
    db.anime.findUnique.mockResolvedValue({ id: "anime" });
    db.manga.findUnique.mockResolvedValue({ id: "manga" });
    anime.getAnimeByMalId.mockResolvedValue({ id: "anime" });
    manga.getMangaByAnilistId.mockResolvedValue({ id: "manga" });
    db.animeEpisodeWatch.findMany.mockResolvedValue([]);
  });

  it("imports exact anime progress, dates, repeat, rating and notes using MAL ID", async () => {
    await processor.importEntry(mapped(), "owner");
    expect(db.anime.findUnique).toHaveBeenCalledWith({ where: { malId: 20 }, select: { id: true } });
    expect(anime.getAnimeByMalId).not.toHaveBeenCalled();
    expect(animeProgress.createOrUpdateAnimeProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "owner",
        animeId: "anime",
        status: "Completed",
        watchCount: 3,
        startedAt: new Date("2020-02-03T00:00:00.000Z"),
        completedAt: new Date("2021-04-05T00:00:00.000Z"),
      }),
      { markAllEpisodes: false },
    );
    expect(episodes.createOrUpdateAnimeEpisodeWatch).toHaveBeenCalledWith({
      userId: "owner",
      animeId: "anime",
      episodes: [
        { episode: 1, status: "Completed" },
        { episode: 2, status: "Completed" },
      ],
    });
    expect(animeReviews.createAnimeReview).toHaveBeenCalledWith(
      expect.objectContaining({ overall: 5, notes: "Original", userId: "owner" }),
    );
  });

  it("imports manga chapter count and art, preserves existing review instead of duplicating", async () => {
    const entry = mapped("MANGA");
    entry.review.art = 4.5;
    db.mangaReview.findUnique.mockResolvedValue({ id: "review", overall: 2 });
    await processor.importEntry(entry, "owner");
    expect(db.manga.findUnique).toHaveBeenCalledWith({ where: { anilistId: 10 }, select: { id: true } });
    expect(manga.getMangaByAnilistId).not.toHaveBeenCalled();
    expect(mangaProgress.createOrUpdateMangaProgress).toHaveBeenCalledWith(
      expect.objectContaining({ chaptersRead: 2, readCount: 3 }),
    );
    expect(mangaReviews.updateMangaReview).toHaveBeenCalledWith(
      expect.objectContaining({ mangaReviewId: "review", art: 4.5, overall: 5 }),
    );
    expect(mangaReviews.createMangaReview).not.toHaveBeenCalled();
  });

  it("reruns matching progress without new progress events or duplicate watched episodes", async () => {
    const entry = mapped();
    db.animeProgress.findUnique.mockResolvedValue({
      status: entry.status,
      watchCount: 3,
      startedAt: entry.startedAt,
      completedAt: entry.completedAt,
    });
    db.animeEpisodeWatch.findMany.mockResolvedValue([{ episode: 1 }, { episode: 2 }]);
    db.animeReview.findUnique.mockResolvedValue({ id: "review", overall: 5 });
    await processor.importEntry(entry, "owner");
    expect(animeProgress.createOrUpdateAnimeProgress).not.toHaveBeenCalled();
    expect(episodes.createOrUpdateAnimeEpisodeWatch).not.toHaveBeenCalled();
    expect(animeReviews.createAnimeReview).not.toHaveBeenCalled();
    expect(animeReviews.updateAnimeReview).toHaveBeenCalled();
  });

  it("reuses existing lists and memberships", async () => {
    const entry = mapped();
    entry.lists = ["Favorites"];
    db.list.findUnique.mockResolvedValue({ id: "list", type: "Anime" });
    db.listItem.findFirst.mockResolvedValue({ id: "item" });
    await processor.importEntry(entry, "owner");
    expect(lists.createList).not.toHaveBeenCalled();
    expect(lists.addItemToList).not.toHaveBeenCalled();
  });

  it("creates missing custom lists and adds resolved catalogue ID", async () => {
    const entry = mapped();
    entry.lists = ["Favorites"];
    db.list.findUniqueOrThrow.mockResolvedValue({ id: "list", type: "Anime" });
    await processor.importEntry(entry, "owner");
    expect(lists.createList).toHaveBeenCalledWith({ userId: "owner", name: "Favorites", type: "Anime" });
    expect(lists.addItemToList).toHaveBeenCalledWith({
      userId: "owner",
      listId: "list",
      type: "Anime",
      animeId: "anime",
    });
  });

  it("resumes stored checkpoint and logs missing MAL ID without matching or writes", async () => {
    const report = {
      ...emptyAnilistReport(2),
      imported: 1,
      items: [{ mediaId: 10, name: "Previous", state: "imported" }],
    };
    const job = {
      progress: report,
      data: {
        userId: "owner",
        entries: [
          { state: "ready", entry: mapped() },
          { state: "skipped", mediaId: 99, name: "No MAL", reason: "missingMalId" },
        ],
      },
      updateProgress: vi.fn(),
    };
    const result = await processor.process(job as any);
    expect(result).toMatchObject({ imported: 1, skipped: 1, total: 2 });
    expect(anime.getAnimeByMalId).not.toHaveBeenCalled();
    expect(job.updateProgress).toHaveBeenCalled();
  });

  it("runs four entries concurrently, serializes checkpoints and resumes out-of-order results", async () => {
    const entries = Array.from({ length: 6 }, (_, index) => ({
      state: "ready",
      entry: { ...mapped(), mediaId: index + 100 },
    }));
    const releases: (() => void)[] = [];
    let active = 0;
    let peak = 0;
    const imported = vi.spyOn(processor, "importEntry").mockImplementation(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise<void>((resolve) => releases.push(resolve));
      active--;
    });
    const checkpoints: any[] = [];
    const job = {
      progress: 0,
      data: { userId: "owner", entries },
      updateProgress: vi.fn(async (report) => {
        checkpoints.push(report);
      }),
    };
    const running = processor.process(job as any);
    await vi.waitFor(() => expect(imported).toHaveBeenCalledTimes(4));
    releases[2]();
    await vi.waitFor(() => expect(imported).toHaveBeenCalledTimes(5));
    releases[0]();
    await vi.waitFor(() => expect(imported).toHaveBeenCalledTimes(6));
    for (const release of releases) release();
    const report = await running;
    expect(peak).toBe(4);
    expect(report.imported).toBe(6);
    expect(checkpoints.map((checkpoint) => checkpoint.items.length)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(checkpoints[0].items[0].mediaId).toBe(102);
    imported.mockClear();
    imported.mockResolvedValue();
    await processor.process({ ...job, progress: checkpoints[0] } as any);
    expect(imported).toHaveBeenCalledTimes(5);
    expect(imported.mock.calls.some(([entry]) => entry.mediaId === 102)).toBe(false);
  });

  it("serializes shared custom-list creation across concurrent entries", async () => {
    let created = false;
    db.list.findUnique.mockImplementation(async () => (created ? { id: "list", type: "Anime" } : null));
    lists.createList.mockImplementation(async () => {
      await Promise.resolve();
      created = true;
    });
    db.list.findUniqueOrThrow.mockResolvedValue({ id: "list", type: "Anime" });
    await Promise.all([
      processor.importEntry({ ...mapped(), lists: ["Favorites"] }, "owner"),
      processor.importEntry({ ...mapped(), lists: ["Favorites"], externalId: 21 }, "owner"),
    ]);
    expect(lists.createList).toHaveBeenCalledTimes(1);
  });
});
