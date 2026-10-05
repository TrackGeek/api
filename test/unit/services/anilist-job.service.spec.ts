import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnilistJobService } from "@/modules/import/anilist-job.service";

describe("AnilistJobService", () => {
  const snapshots = { collect: vi.fn() };
  const cache = { set: vi.fn(), get: vi.fn(), redis: { hSet: vi.fn(), hmGet: vi.fn(), expire: vi.fn() } };
  const queue = { getJob: vi.fn(), add: vi.fn() };
  const service = new AnilistJobService(snapshots as any, cache as any, queue as any);

  beforeEach(() => vi.resetAllMocks());

  it("stores owner-bound mapped snapshot without starting import", async () => {
    snapshots.collect.mockResolvedValue({ entries: [], scoreFormat: "POINT_3", counts: { total: 0 } });
    const snapshot = await service.snapshot("Kuriel", "owner");
    expect(cache.set).toHaveBeenCalledWith(
      `anilist-snapshot:${snapshot.snapshotId}`,
      { userId: "owner", entries: [], scoreFormat: "POINT_3" },
      86400,
    );
    expect(queue.add).not.toHaveBeenCalled();
  });

  it("starts stored snapshot once, reuses job ID on duplicate submission", async () => {
    const data = { userId: "owner", entries: [] };
    cache.get.mockResolvedValue(data);
    queue.add.mockResolvedValue({ id: "snapshot" });
    expect(await service.start("snapshot", "owner")).toEqual({ jobId: "snapshot" });
    expect(queue.add).toHaveBeenCalledWith("import", data, expect.objectContaining({ jobId: "snapshot", attempts: 4 }));
    queue.getJob.mockResolvedValue({ id: "snapshot", data });
    await service.start("snapshot", "owner");
    expect(queue.add).toHaveBeenCalledTimes(1);
  });

  it("retains all original entry fields separately from compact import data", async () => {
    const source = {
      id: 100,
      mediaId: 10,
      status: "COMPLETED",
      progress: 2,
      repeat: 0,
      notes: "Original",
      media: {
        id: 10,
        idMal: null,
        type: "ANIME",
        title: { native: "原題" },
        externalLinks: [{ site: "MAL", url: "https://example.com" }],
      },
    };
    snapshots.collect.mockResolvedValue({ entries: [source], scoreFormat: "POINT_3" });
    const snapshot = await service.snapshot("Kuriel", "owner");
    expect(cache.redis.hSet).toHaveBeenCalledWith(`anilist-source:${snapshot.snapshotId}`, {
      "10": JSON.stringify(source),
    });
    expect(cache.redis.expire).toHaveBeenCalledWith(`anilist-source:${snapshot.snapshotId}`, 86400);
  });

  it("rejects expired snapshots and snapshots owned by another account", async () => {
    cache.get.mockResolvedValue(null);
    await expect(service.start("snapshot", "owner")).rejects.toBeInstanceOf(NotFoundException);
    cache.get.mockResolvedValue({ userId: "other", entries: [] });
    await expect(service.start("snapshot", "owner")).rejects.toBeInstanceOf(NotFoundException);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it("hides existing jobs and reports from other accounts", async () => {
    queue.getJob.mockResolvedValue({ id: "snapshot", data: { userId: "other" } });
    await expect(service.start("snapshot", "owner")).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.status("snapshot", "owner")).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.failures("snapshot", "owner")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("exports only failed outcomes with original and mapped data, excluding imported warnings", async () => {
    const source = { mediaId: 2, notes: "Original", advancedScores: { Story: 100 }, media: { id: 2, idMal: 20 } };
    const entries = [{ state: "skipped", mediaId: 2, name: "Skipped", reason: "missingMalId" }];
    queue.getJob.mockResolvedValue({
      data: { userId: "owner", entries, scoreFormat: "POINT_100" },
      progress: {
        items: [
          { mediaId: 1, name: "Imported", state: "imported", warnings: ["partialStartedAt"] },
          { mediaId: 2, name: "Skipped", state: "skipped", reason: "missingMalId" },
          { mediaId: 3, name: "Unmatched", state: "unmatched" },
          { mediaId: 4, name: "Failed", state: "failed" },
        ],
      },
    });
    cache.redis.hmGet.mockResolvedValue([JSON.stringify(source), null, null]);
    const result = await service.failures("snapshot", "owner");
    expect(result.items.map((item) => item.mediaId)).toEqual([2, 3, 4]);
    expect(result.items[0]).toMatchObject({ source, mapped: entries[0], scoreFormat: "POINT_100" });
    expect(result.items[1].source).toBeUndefined();
  });
});
