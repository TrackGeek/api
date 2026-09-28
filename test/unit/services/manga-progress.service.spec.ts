import { ActivityType, ProgressStatus } from "@prisma/generated/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MangaProgressService } from "@/modules/manga/service/manga-progress.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { MediaFilterService } from "@/shared/media-filter/media-filter.service";
import { MediaReleaseService } from "@/shared/media-release/media-release.service";

describe("MangaProgressService", () => {
  const database = {
    manga: { findUnique: vi.fn() },
    mangaProgress: { findUnique: vi.fn(), upsert: vi.fn() },
  };
  const queue = { toActivityJob: vi.fn(), toXpJob: vi.fn() };
  const release = { assertProgressStatusAllowed: vi.fn() };
  const service = new MangaProgressService(
    database as unknown as DatabaseService,
    queue as unknown as QueueService,
    {} as MediaFilterService,
    release as unknown as MediaReleaseService,
  );
  const input = { userId: "user-1", mangaId: "manga-1", status: ProgressStatus.Reading };

  beforeEach(() => {
    vi.clearAllMocks();
    database.manga.findUnique.mockResolvedValue({ numberOfChapters: 100 });
    database.mangaProgress.findUnique.mockResolvedValue({ status: ProgressStatus.Reading, chaptersRead: 1 });
    database.mangaProgress.upsert.mockResolvedValue({ id: "progress-1" });
  });

  it("records only newly read chapters without recreating the started activity", async () => {
    await service.createOrUpdateMangaProgress({ ...input, chaptersRead: 6 });

    expect(queue.toActivityJob).toHaveBeenCalledExactlyOnceWith({
      type: ActivityType.ChaptersRead,
      userId: "user-1",
      mangaProgressId: "progress-1",
      metadata: { id: "progress-1", from: 2, to: 6, count: 5 },
    });
  });

  it.each([undefined, 1, 0])(
    "does not emit activities for unchanged or reduced chapters (%s)",
    async (chaptersRead) => {
      await service.createOrUpdateMangaProgress({ ...input, chaptersRead });

      expect(queue.toActivityJob).not.toHaveBeenCalled();
    },
  );

  it("records the initial status and chapters when creating progress", async () => {
    database.mangaProgress.findUnique.mockResolvedValue(null);

    await service.createOrUpdateMangaProgress({ ...input, chaptersRead: 1 });

    expect(queue.toActivityJob).toHaveBeenCalledTimes(2);
    expect(queue.toActivityJob).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: ActivityType.ProgressStarted }),
    );
    expect(queue.toActivityJob).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: ActivityType.ChaptersRead,
        metadata: { id: "progress-1", from: 1, to: 1, count: 1 },
      }),
    );
  });

  it("records completion alongside the final chapters", async () => {
    await service.createOrUpdateMangaProgress({ ...input, status: ProgressStatus.Completed, chaptersRead: 100 });

    expect(queue.toActivityJob).toHaveBeenCalledTimes(2);
    expect(queue.toActivityJob).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: ActivityType.ProgressCompleted }),
    );
    expect(queue.toActivityJob).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: ActivityType.ChaptersRead,
        metadata: { id: "progress-1", from: 2, to: 100, count: 99 },
      }),
    );
  });
});
