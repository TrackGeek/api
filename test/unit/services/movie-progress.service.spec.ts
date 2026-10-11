import { ContentType, ProgressStatus, XpReason } from "@prisma/generated/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MovieProgressService } from "@/modules/movie/service/movie-progress.service";

describe("MovieProgressService", () => {
  const db = { movieProgress: { upsert: vi.fn() } };
  const queue = { toActivityJob: vi.fn(), toXpJob: vi.fn() };
  const release = { assertProgressStatusAllowed: vi.fn() };
  const service = new MovieProgressService(db as any, queue as any, {} as any, release as any);

  beforeEach(() => {
    vi.resetAllMocks();
    db.movieProgress.upsert.mockResolvedValue({ id: "progress", movie: {}, user: {} });
  });

  it("persists imported dates for both new and existing movie progress without setting watchCount", async () => {
    const startedAt = new Date("2020-01-01");
    const completedAt = new Date("2020-02-01");
    await service.createOrUpdateMovieProgress({
      movieId: "movie",
      userId: "owner",
      status: ProgressStatus.Completed,
      startedAt,
      completedAt,
    });
    const args = db.movieProgress.upsert.mock.calls[0][0];
    expect(args.create).toMatchObject({ startedAt, completedAt, watchCount: undefined });
    expect(args.update).toMatchObject({ startedAt, completedAt, watchCount: undefined });
    expect(queue.toActivityJob).toHaveBeenCalled();
    expect(queue.toXpJob).toHaveBeenCalledWith(
      expect.objectContaining({ reason: XpReason.ProgressCompleted, contentType: ContentType.Movie }),
    );
  });

  it("clears dates explicitly when replacing progress without known dates", async () => {
    await service.createOrUpdateMovieProgress({
      movieId: "movie",
      userId: "owner",
      status: ProgressStatus.Planning,
      startedAt: null,
      completedAt: null,
    } as any);
    expect(db.movieProgress.upsert.mock.calls[0][0].update).toMatchObject({ startedAt: null, completedAt: null });
  });

  it("retains release validation before persisting imported progress", async () => {
    release.assertProgressStatusAllowed.mockRejectedValueOnce(new Error("Unreleased"));
    await expect(
      service.createOrUpdateMovieProgress({ movieId: "movie", userId: "owner", status: ProgressStatus.Completed }),
    ).rejects.toThrow("Unreleased");
    expect(db.movieProgress.upsert).not.toHaveBeenCalled();
  });
});
