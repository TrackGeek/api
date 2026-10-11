import { ContentType, ProgressStatus, XpReason } from "@prisma/generated/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TVShowProgressService } from "@/modules/tv-show/service/tv-show-progress.service";

describe("TVShowProgressService", () => {
  const db = { tvShowProgress: { upsert: vi.fn() } };
  const queue = { toActivityJob: vi.fn(), toXpJob: vi.fn() };
  const episodes = { watchAllEpisodesOfTVShow: vi.fn() };
  const release = { assertProgressStatusAllowed: vi.fn() };
  const service = new TVShowProgressService(db as any, queue as any, episodes as any, {} as any, release as any);

  beforeEach(() => {
    vi.resetAllMocks();
    db.tvShowProgress.upsert.mockResolvedValue({ id: "progress", tvShow: {}, user: {} });
  });

  it("keeps normal completion marking every episode", async () => {
    await service.createOrUpdateTVShowProgress({ tvShowId: "tv", userId: "owner", status: ProgressStatus.Completed });
    expect(episodes.watchAllEpisodesOfTVShow).toHaveBeenCalledWith({ tvShowId: "tv", userId: "owner" });
  });

  it("imports completion without inventing episodes while keeping activity and XP", async () => {
    await service.createOrUpdateTVShowProgress({
      tvShowId: "tv",
      userId: "owner",
      status: ProgressStatus.Completed,
      markAllEpisodes: false,
      startedAt: new Date("2020-01-01"),
      completedAt: new Date("2020-02-01"),
    });
    expect(episodes.watchAllEpisodesOfTVShow).not.toHaveBeenCalled();
    expect(db.tvShowProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: ProgressStatus.Completed,
          startedAt: new Date("2020-01-01"),
          completedAt: new Date("2020-02-01"),
        }),
      }),
    );
    expect(queue.toActivityJob).toHaveBeenCalled();
    expect(queue.toXpJob).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: XpReason.ProgressCompleted,
        contentType: ContentType.TVShow,
        userId: "owner",
      }),
    );
  });

  it("keeps release validation when importing exact episode progress", async () => {
    release.assertProgressStatusAllowed.mockRejectedValueOnce(new Error("Unreleased"));
    await expect(
      service.createOrUpdateTVShowProgress({
        tvShowId: "tv",
        userId: "owner",
        status: ProgressStatus.Completed,
        markAllEpisodes: false,
      }),
    ).rejects.toThrow("Unreleased");
    expect(db.tvShowProgress.upsert).not.toHaveBeenCalled();
  });
});
