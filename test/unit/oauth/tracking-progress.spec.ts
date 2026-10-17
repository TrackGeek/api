import { ProgressStatus, WatchEpisodeStatus } from "@prisma/generated/enums";
import { describe, expect, it, vi } from "vitest";
import { BookProgressService } from "@/modules/book/service/book-progress.service";
import { TrackingProgressService } from "@/modules/integrations/service/tracking-progress.service";

const ID = "019ce334-c8ac-7883-949d-948f53218272";

function setup() {
  let row: Record<string, any> | null = null;
  let held = false;
  const database = {
    book: { findUnique: vi.fn().mockResolvedValue({ id: ID, numberOfPages: 300 }) },
    movie: { findUnique: vi.fn().mockResolvedValue({ id: ID }) },
    tvShow: { findUnique: vi.fn().mockResolvedValue({ id: ID }) },
    bookProgress: {
      findUnique: vi.fn(async () => row),
      upsert: vi.fn(async ({ create, update }) => {
        row = {
          id: "progress",
          ...(row ?? create),
          ...(row ? Object.fromEntries(Object.entries(update).filter(([, value]) => value !== undefined)) : {}),
        };
        return row;
      }),
    },
    movieProgress: { findUnique: vi.fn(async () => row) },
    tvShowProgress: { findUnique: vi.fn(async () => row) },
    tvShowEpisodeWatch: { findUnique: vi.fn(async () => row) },
  };
  const cache = {
    redis: {
      set: vi.fn(async () => {
        if (held) return null;
        held = true;
        return "OK";
      }),
      eval: vi.fn(async () => {
        held = false;
        return 1;
      }),
    },
  };
  const queue = { toActivityJob: vi.fn(), toXpJob: vi.fn() };
  const book = new BookProgressService(
    database as any,
    queue as any,
    {} as any,
    { assertProgressStatusAllowed: vi.fn() } as any,
  );
  const movie = {
    createOrUpdateMovieProgress: vi.fn(async (data) => {
      row = { id: "progress", ...data };
    }),
  };
  const tv = {
    createOrUpdateTVShowProgress: vi.fn(async (data) => {
      row = { id: "progress", ...data };
    }),
  };
  const tvEpisodes = {
    createOrUpdateTVShowEpisodeWatch: vi.fn(async ({ episodes }) => {
      row = episodes[0];
    }),
  };
  const library = { progress: vi.fn(async () => ({ progress: row })) };
  const service = new TrackingProgressService(
    database as any,
    library as any,
    {} as any,
    {} as any,
    tv as any,
    movie as any,
    {} as any,
    book,
    {} as any,
    tvEpisodes as any,
    cache as any,
  );
  return {
    service,
    database,
    queue,
    cache,
    book,
    movie,
    tv,
    tvEpisodes,
    getRow: () => row,
    setRow: (value: Record<string, any> | null) => {
      row = value;
    },
  };
}

describe("Integration progress writes", () => {
  it("sets absolute pages, preserves edition total and emits no duplicate effects on retry", async () => {
    const { service, database, queue, getRow } = setup();
    const first = await service.setBook("owner", { id: ID, pagesRead: 120, totalPages: 400 });
    const activityCount = queue.toActivityJob.mock.calls.length;
    const second = await service.setBook("owner", { id: ID, pagesRead: 120 });
    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(getRow()).toMatchObject({
      userId: "owner",
      chaptersRead: 120,
      totalPages: 400,
      status: ProgressStatus.Reading,
    });
    expect(database.bookProgress.upsert).toHaveBeenCalledTimes(1);
    expect(queue.toActivityJob).toHaveBeenCalledTimes(activityCount);
  });

  it("uses existing page validation and rejects injected identities before writes", async () => {
    const { service, database } = setup();
    await expect(service.setBook("owner", { id: ID, pagesRead: 301 })).rejects.toMatchObject({ status: 400 });
    await expect(service.setBook("owner", { id: ID, pagesRead: -1 })).rejects.toMatchObject({ status: 422 });
    await expect(service.setBook("owner", { id: ID, pagesRead: 120, userId: "victim" })).rejects.toMatchObject({
      status: 422,
    });
    expect(database.bookProgress.upsert).not.toHaveBeenCalled();
  });

  it("preserves existing book status when changing pages", async () => {
    const { service, setRow, getRow } = setup();
    setRow({ id: "progress", status: ProgressStatus.Paused, chaptersRead: 10, totalPages: 300 });
    await service.setBook("owner", { id: ID, pagesRead: 20 });
    expect(getRow()).toMatchObject({ status: ProgressStatus.Paused, chaptersRead: 20 });
  });

  it("sets completion date once and does not invent watch counts on retry", async () => {
    const { service, movie, getRow } = setup();
    await service.setStatus("owner", { type: "movie", id: ID, status: ProgressStatus.Completed });
    const date = getRow()?.completedAt;
    const retry = await service.setStatus("owner", { type: "movie", id: ID, status: ProgressStatus.Completed });
    expect(date).toBeInstanceOf(Date);
    expect(retry.changed).toBe(false);
    expect(movie.createOrUpdateMovieProgress).toHaveBeenCalledTimes(1);
    expect(movie.createOrUpdateMovieProgress.mock.calls[0][0]).not.toHaveProperty("watchCount");
  });

  it("requires explicit bulk episode completion and rejects mismatched media statuses", async () => {
    const { service, tv } = setup();
    await service.setStatus("owner", { type: "tv", id: ID, status: ProgressStatus.Completed });
    expect(tv.createOrUpdateTVShowProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({ markAllEpisodes: false }),
    );
    await service.setStatus("owner", { type: "tv", id: ID, status: ProgressStatus.Completed, markAllEpisodes: true });
    expect(tv.createOrUpdateTVShowProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({ markAllEpisodes: true }),
    );
    await expect(
      service.setStatus("owner", { type: "movie", id: ID, status: ProgressStatus.Reading }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      service.setStatus("owner", { type: "tv", id: ID, status: ProgressStatus.Watching, markAllEpisodes: true }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("requires TV seasons and treats repeating episode marks as a no-op", async () => {
    const { service, tvEpisodes } = setup();
    await expect(
      service.setEpisode("owner", { type: "tv", id: ID, episode: 2, status: WatchEpisodeStatus.Completed }),
    ).rejects.toMatchObject({ status: 422 });
    const input = { type: "tv", id: ID, season: 1, episode: 2, status: WatchEpisodeStatus.Completed };
    await service.setEpisode("owner", input);
    const result = await service.setEpisode("owner", input);
    expect(result.changed).toBe(false);
    expect(tvEpisodes.createOrUpdateTVShowEpisodeWatch).toHaveBeenCalledTimes(1);
    expect(tvEpisodes.createOrUpdateTVShowEpisodeWatch).toHaveBeenCalledWith({
      userId: "owner",
      tvShowId: ID,
      episodes: [{ season: 1, episode: 2, status: WatchEpisodeStatus.Completed }],
    });
  });

  it("rejects concurrent updates of the same user's title and releases the lock on failure", async () => {
    const { service, book, cache } = setup();
    let enter!: () => void;
    let finish!: () => void;
    const entered = new Promise<void>((resolve) => {
      enter = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    vi.spyOn(book, "createOrUpdateBookProgress").mockImplementationOnce(async () => {
      enter();
      await gate;
    });
    const first = service.setBook("owner", { id: ID, pagesRead: 120 });
    await entered;
    await expect(service.setBook("owner", { id: ID, pagesRead: 121 })).rejects.toMatchObject({ status: 409 });
    finish();
    await first;
    expect(cache.redis.eval).toHaveBeenCalledTimes(1);
    await service.setBook("owner", { id: ID, pagesRead: 122 });
    expect(cache.redis.eval).toHaveBeenCalledTimes(2);
  });
});
