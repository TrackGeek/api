import { randomUUID } from "node:crypto";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Queue } from "bullmq";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { type AnilistMappingResult, mapAnilistEntry } from "./anilist-mapping";
import type { AnilistEntry } from "./anilist-snapshot.service";
import { AnilistSnapshotService } from "./anilist-snapshot.service";

export const ANILIST_IMPORT_QUEUE = "anilist-import";
export interface AnilistJobData {
  userId: string;
  entries: AnilistMappingResult[];
  scoreFormat?: string;
}
export interface AnilistImportItem {
  mediaId: number;
  name: string;
  state: "imported" | "skipped" | "unmatched" | "failed";
  reason?: string;
  warnings?: string[];
}
export interface AnilistImportReport {
  total: number;
  imported: number;
  skipped: number;
  unmatched: number;
  failed: number;
  items: AnilistImportItem[];
}
export const emptyAnilistReport = (total: number): AnilistImportReport => ({
  total,
  imported: 0,
  skipped: 0,
  unmatched: 0,
  failed: 0,
  items: [],
});

@Injectable()
export class AnilistJobService {
  constructor(
    private readonly snapshots: AnilistSnapshotService,
    private readonly cache: CacheService,
    @InjectQueue(ANILIST_IMPORT_QUEUE) private readonly queue: Queue<AnilistJobData>,
  ) {}

  async snapshot(username: string, userId: string) {
    const snapshot = await this.snapshots.collect(username);
    const snapshotId = randomUUID();
    const entries = snapshot.entries.map((entry) => mapAnilistEntry(entry, snapshot.scoreFormat));
    if (snapshot.entries.length) {
      await this.cache.redis.hSet(
        `anilist-source:${snapshotId}`,
        Object.fromEntries(snapshot.entries.map((entry) => [String(entry.mediaId), JSON.stringify(entry)])),
      );
      await this.cache.redis.expire(`anilist-source:${snapshotId}`, 86400);
    }
    await this.cache.set(
      `anilist-snapshot:${snapshotId}`,
      { userId, entries, scoreFormat: snapshot.scoreFormat },
      86400,
    );
    return { ...snapshot, snapshotId };
  }

  async start(snapshotId: string, userId: string) {
    const existing = await this.queue.getJob(snapshotId);
    if (existing) {
      if (existing.data.userId !== userId) throw new NotFoundException();
      return { jobId: existing.id };
    }
    const data = await this.cache.get<AnilistJobData>(`anilist-snapshot:${snapshotId}`);
    if (!data || data.userId !== userId) throw new NotFoundException();
    await this.cache.redis.expire(`anilist-source:${snapshotId}`, 604800);
    const job = await this.queue.add("import", data, {
      jobId: snapshotId,
      attempts: 4,
      backoff: { type: "fixed", delay: 5000 },
      removeOnComplete: { age: 604800, count: 1000 },
      removeOnFail: { age: 604800, count: 1000 },
    });
    return { jobId: job.id };
  }

  async status(jobId: string, userId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job || job.data.userId !== userId) throw new NotFoundException();
    return {
      jobId: job.id,
      state: await job.getState(),
      entries: job.data.entries.map((mapped) =>
        mapped.state === "ready"
          ? { mediaId: mapped.entry.mediaId, name: mapped.entry.name, status: mapped.entry.status }
          : { mediaId: mapped.mediaId, name: mapped.name },
      ),
      report:
        typeof job.progress === "object"
          ? (job.progress as AnilistImportReport)
          : emptyAnilistReport(job.data.entries.length),
    };
  }

  async failures(jobId: string, userId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job || job.data.userId !== userId) throw new NotFoundException();
    const report =
      typeof job.progress === "object"
        ? (job.progress as AnilistImportReport)
        : emptyAnilistReport(job.data.entries.length);
    const items = report.items.filter((item) => ["skipped", "unmatched", "failed"].includes(item.state));
    const sources = items.length
      ? await this.cache.redis.hmGet(
          `anilist-source:${jobId}`,
          items.map((item) => String(item.mediaId)),
        )
      : [];
    const entries = new Map(
      job.data.entries.map((mapped) => [mapped.state === "ready" ? mapped.entry.mediaId : mapped.mediaId, mapped]),
    );
    return {
      items: items.map((item, index) => ({
        ...item,
        scoreFormat: job.data.scoreFormat,
        source: sources[index] ? (JSON.parse(sources[index]) as AnilistEntry) : undefined,
        mapped: entries.get(item.mediaId),
      })),
    };
  }
}
