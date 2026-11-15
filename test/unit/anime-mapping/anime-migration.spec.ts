import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnimeMigrationService } from "@/modules/anime-mapping/service/anime-migration.service";

function delegate() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockResolvedValue({ id: "target" }),
    create: vi.fn().mockResolvedValue({ id: "created" }),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  };
}

describe("Anime tracking migration", () => {
  let database: any;
  let tx: any;
  let mappings: any;
  let service: AnimeMigrationService;
  const startedAt = new Date("2020-01-01");
  const completedAt = new Date("2020-02-01");

  beforeEach(() => {
    tx = Object.fromEntries(
      [
        "movieProgress",
        "tvShowProgress",
        "movieReview",
        "tvShowReview",
        "animeProgress",
        "animeReview",
        "animeEpisodeWatch",
        "tvShowEpisodeWatch",
        "favorite",
        "listItem",
        "list",
        "comment",
        "post",
        "activity",
        "notification",
        "reaction",
        "animeMigrationArchive",
      ].map((model) => [model, delegate()]),
    );
    tx.$executeRaw = vi.fn();
    database = {
      anime: { findUnique: vi.fn().mockImplementation(({ where }: any) => ({ id: `anime-${where.malId}` })) },
      movie: delegate(),
      tvShow: delegate(),
      tvShowEpisodeWatch: delegate(),
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    mappings = {
      initialize: vi.fn(),
      refreshIfDue: vi.fn(),
      mappings: vi.fn().mockResolvedValue([{ malId: 164, season: null, episodeOffset: 0 }]),
    };
    service = new AnimeMigrationService(database, mappings, {} as any);
  });

  it("moves completed progress with dates/counts, archives source and reattaches activity before deletion", async () => {
    const source = {
      id: "source-progress",
      movieId: "movie",
      userId: "owner",
      status: "Completed",
      watchCount: 2,
      startedAt,
      completedAt,
      createdAt: startedAt,
      updatedAt: completedAt,
    };
    tx.movieProgress.findMany.mockResolvedValue([source]);
    await service.migrate("movie", "movie", 128);
    expect(database.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 60000 });
    expect(tx.animeProgress.upsert).toHaveBeenCalledWith({
      where: { userId_animeId: { userId: "owner", animeId: "anime-164" } },
      update: {},
      create: {
        userId: "owner",
        animeId: "anime-164",
        status: "Completed",
        watchCount: 2,
        startedAt,
        completedAt,
        createdAt: startedAt,
        updatedAt: completedAt,
      },
    });
    expect(tx.animeMigrationArchive.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: "owner",
          sourceType: "movieProgress",
          payload: expect.objectContaining({ status: "Completed", startedAt: startedAt.toISOString() }),
        }),
      }),
    );
    expect(tx.activity.updateMany).toHaveBeenCalledWith({
      where: { movieProgressId: "source-progress" },
      data: { movieProgressId: null, animeProgressId: "target" },
    });
    expect(tx.movieProgress.delete.mock.invocationCallOrder[0]).toBeGreaterThan(
      tx.activity.updateMany.mock.invocationCallOrder[0],
    );
    expect(tx.movieProgress.delete.mock.invocationCallOrder[0]).toBeGreaterThan(
      tx.animeMigrationArchive.upsert.mock.invocationCallOrder[0],
    );
  });

  it("preserves existing anime review on collision and archives every original review criterion", async () => {
    tx.movieReview.findMany.mockResolvedValue([
      {
        id: "source-review",
        userId: "owner",
        overall: "8.5",
        direction: "9",
        acting: "7",
        production: "8",
        summary: "Review",
        notes: "Notes",
        story: "Story",
        recommended: true,
      },
    ]);
    tx.reaction.findMany.mockResolvedValue([{ id: "reaction", userId: "fan", emoji: "heart" }]);
    tx.reaction.findUnique.mockResolvedValue({ id: "existing-reaction" });
    await service.migrate("movie", "movie", 128);
    expect(tx.animeReview.upsert.mock.calls[0][0]).toMatchObject({
      update: {},
      create: { overall: "8.5", notes: "Notes\n\nStory", summary: "Review", recommended: true },
    });
    expect(tx.animeMigrationArchive.upsert.mock.calls[0][0].create.payload).toMatchObject({
      direction: "9",
      production: "8",
      acting: "7",
    });
    expect(tx.notification.updateMany).toHaveBeenCalledWith({
      where: { reactionId: "reaction" },
      data: { reactionId: "existing-reaction" },
    });
    expect(tx.reaction.delete).toHaveBeenCalledWith({ where: { id: "reaction" } });
    expect(tx.movieReview.delete.mock.invocationCallOrder[0]).toBeGreaterThan(
      tx.notification.updateMany.mock.invocationCallOrder[0],
    );
  });

  it("does not delete source tracking when target persistence fails", async () => {
    tx.movieProgress.findMany.mockResolvedValue([{ id: "source", userId: "owner", status: "Planning" }]);
    tx.animeProgress.upsert.mockRejectedValue(new Error("database unavailable"));
    await expect(service.migrate("movie", "movie", 128)).rejects.toThrow("database unavailable");
    expect(tx.movieProgress.delete).not.toHaveBeenCalled();
    expect(tx.movieReview.delete).not.toHaveBeenCalled();
  });

  it("skips unmapped media and is idempotent once source tracking is gone", async () => {
    mappings.mappings.mockResolvedValueOnce([]);
    await service.migrate("movie", "movie", 999);
    expect(database.$transaction).not.toHaveBeenCalled();
    await service.migrate("movie", "movie", 128);
    await service.migrate("movie", "movie", 128);
    expect(tx.animeProgress.upsert).not.toHaveBeenCalled();
    expect(tx.movieProgress.delete).not.toHaveBeenCalled();
  });

  it("maps season and split-cour offsets, preserves unmapped episodes, reattaches episode activities", async () => {
    mappings.mappings.mockResolvedValue([
      { malId: 300, season: 1, episodeOffset: 0 },
      { malId: 1225, season: 1, episodeOffset: 12 },
    ]);
    database.tvShowEpisodeWatch.findMany.mockResolvedValue([{ season: 1 }, { season: 99 }]);
    tx.tvShowEpisodeWatch.findMany.mockResolvedValue([
      { id: "ep-one", userId: "owner", season: 1, episode: 1, status: "Completed" },
      { id: "ep-two", userId: "owner", season: 1, episode: 13, status: "Completed" },
      { id: "unmapped", userId: "owner", season: 99, episode: 1, status: "Completed" },
    ]);
    await service.migrate("tv", "tv-show", 62913);
    expect(tx.animeEpisodeWatch.upsert.mock.calls.map(([args]: any[]) => args.create)).toEqual([
      expect.objectContaining({ animeId: "anime-300", episode: 1 }),
      expect.objectContaining({ animeId: "anime-1225", episode: 1 }),
    ]);
    expect(tx.tvShowEpisodeWatch.delete).toHaveBeenCalledTimes(2);
    expect(tx.tvShowEpisodeWatch.delete).not.toHaveBeenCalledWith({ where: { id: "unmapped" } });
    expect(tx.activity.updateMany).toHaveBeenCalledWith({
      where: { tvShowEpisodeWatchId: "ep-two" },
      data: { tvShowEpisodeWatchId: null, animeEpisodeWatchId: "target" },
    });
  });

  it("scans real Prisma relation names and retries each run after a per-media failure", async () => {
    database.movie.findMany.mockResolvedValue([{ id: "source", tmdbId: 128 }]);
    const migrate = vi.spyOn(service, "migrate").mockRejectedValue(new Error("upstream unavailable"));
    await service.run();
    await service.run();
    expect(migrate).toHaveBeenCalledTimes(2);
    expect(database.tvShow.findMany.mock.calls[0][0].where.OR).toEqual(
      expect.arrayContaining([
        { tvshowProgresses: { some: {} } },
        { tvshowReviews: { some: {} } },
        { tvshowEpisodesWatch: { some: {} } },
      ]),
    );
  });
});
