import { createHash } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import axios, { AxiosError } from "axios";
import { PrismaClient } from "../../prisma/generated/client";
import { AppException } from "../../src/shared/exceptions/app.exceptions";
import { R2QuotaExceededError, R2Service } from "../../src/shared/infra/integrations/r2.service";
import { convertImageToWebp, WEBP_CONTENT_TYPE } from "../../src/shared/infra/upload/image-converter";

const IMGBB_HOSTS = new Set(["i.ibb.co", "image.ibb.co"]);
const DEFAULT_MAX_IMAGES = 100;
const DEFAULT_MAX_BYTES = 250 * 1024 * 1024;
const DEFAULT_DELAY_MS = 2_000;
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_DOWNLOAD_BYTES = 32 * 1024 * 1024;
const DEFAULT_DOWNLOAD_ATTEMPTS = 5;

export interface MigrationSource {
  model: string;
  delegate: string;
  field: string;
  type: "String" | "Json";
}

export interface MigrationOptions {
  dryRun?: boolean;
  maxImages?: number;
  maxBytes?: number;
  delayMs?: number;
  batchSize?: number;
  downloadTimeoutMs?: number;
  maxDownloadBytes?: number;
  downloadAttempts?: number;
  webpQuality?: number;
  sources?: MigrationSource[];
  logger?: Pick<Console, "log" | "warn">;
}

export interface MigrationStats {
  scannedRows: number;
  matchedRows: number;
  updatedRows: number;
  skippedRows: number;
  uniqueUrls: number;
  uploadedImages: number;
  reusedImages: number;
  uploadedBytes: number;
  failedUrls: number;
  limitReached: boolean;
}

interface MigrationDelegate {
  findMany(args: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
}

class MigrationLimitReached extends Error {}

class ImgbbRateLimitReached extends Error {}

export function isImgbbUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && IMGBB_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function collectImgbbUrls(value: unknown): string[] {
  if (typeof value === "string") return isImgbbUrl(value) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(collectImgbbUrls);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectImgbbUrls);
  return [];
}

const MIGRATION_SOURCES: MigrationSource[] = [
  { model: "GameScreenshot", delegate: "gameScreenshot", field: "url", type: "String" },
  { model: "Profile", delegate: "profile", field: "avatarUrl", type: "String" },
  { model: "Profile", delegate: "profile", field: "bannerUrl", type: "String" },
];

export function getMigrationSources(): MigrationSource[] {
  return MIGRATION_SOURCES.map((source) => ({ ...source }));
}

export function getImgbbMigrationKey(sourceUrl: string): string {
  return `migrations/imgbb/${createHash("sha256").update(sourceUrl).digest("hex")}.webp`;
}

export class ImgbbR2Migration {
  private readonly dryRun: boolean;
  private readonly maxImages: number;
  private readonly maxBytes: number;
  private readonly delayMs: number;
  private readonly batchSize: number;
  private readonly downloadTimeoutMs: number;
  private readonly maxDownloadBytes: number;
  private readonly downloadAttempts: number;
  private readonly webpQuality: number;
  private readonly sources: MigrationSource[];
  private readonly logger: Pick<Console, "log" | "warn">;
  private readonly urlMap = new Map<string, string>();
  private readonly failures = new Map<string, string>();
  private readonly seenUrls = new Set<string>();
  private readonly stats: MigrationStats = {
    scannedRows: 0,
    matchedRows: 0,
    updatedRows: 0,
    skippedRows: 0,
    uniqueUrls: 0,
    uploadedImages: 0,
    reusedImages: 0,
    uploadedBytes: 0,
    failedUrls: 0,
    limitReached: false,
  };
  private processedImages = 0;
  private lastDownloadAt = 0;

  constructor(
    private readonly database: PrismaClient,
    private readonly r2: R2Service,
    options: MigrationOptions = {},
  ) {
    this.dryRun = options.dryRun ?? false;
    this.maxImages = options.maxImages ?? DEFAULT_MAX_IMAGES;
    this.maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    this.delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
    this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    this.downloadTimeoutMs = options.downloadTimeoutMs ?? DEFAULT_DOWNLOAD_TIMEOUT_MS;
    this.maxDownloadBytes = options.maxDownloadBytes ?? DEFAULT_MAX_DOWNLOAD_BYTES;
    this.downloadAttempts = options.downloadAttempts ?? DEFAULT_DOWNLOAD_ATTEMPTS;
    this.webpQuality = options.webpQuality ?? 82;
    this.sources = options.sources ?? getMigrationSources();
    this.logger = options.logger ?? console;
  }

  async run(): Promise<MigrationStats> {
    try {
      for (const source of this.sources) await this.migrateSource(source);
    } catch (error) {
      if (error instanceof R2QuotaExceededError) {
        this.stats.limitReached = true;
        this.logger.log("R2 storage cap reached. Free space or raise R2_MAX_STORAGE_BYTES, then run again.");
      } else if (error instanceof ImgbbRateLimitReached) {
        this.stats.limitReached = true;
        this.logger.log("ImgBB rate limit persisted after retries. Run again later to continue.");
      } else {
        if (!(error instanceof MigrationLimitReached)) throw error;
        this.stats.limitReached = true;
        this.logger.log(`Migration limit reached after ${this.processedImages} images. Run again to continue.`);
      }
    } finally {
      this.stats.uniqueUrls = this.seenUrls.size;
      this.stats.failedUrls = this.failures.size;
    }

    return this.stats;
  }

  private async migrateSource(source: MigrationSource): Promise<void> {
    const delegate = (this.database as unknown as Record<string, unknown>)[source.delegate] as
      | MigrationDelegate
      | undefined;
    if (!delegate) throw new Error(`Prisma delegate not found: ${source.delegate}`);

    let cursor: string | undefined;

    while (true) {
      const rows = await delegate.findMany({
        where: cursor ? { id: { gt: cursor } } : {},
        select: { id: true, [source.field]: true },
        orderBy: { id: "asc" },
        take: this.batchSize,
      });

      if (rows.length === 0) return;

      for (const row of rows) {
        this.stats.scannedRows += 1;
        await this.migrateRow(delegate, source, row);
      }

      cursor = rows[rows.length - 1].id as string;
      if (rows.length < this.batchSize) return;
    }
  }

  private async migrateRow(
    delegate: MigrationDelegate,
    source: MigrationSource,
    row: Record<string, unknown>,
  ): Promise<void> {
    const originalValue = row[source.field];
    const urls = collectImgbbUrls(originalValue);
    if (urls.length === 0) return;

    this.stats.matchedRows += 1;
    for (const url of urls) this.seenUrls.add(url);
    if (this.dryRun) return;

    const updatedValue = await this.replaceUrls(originalValue);
    if (updatedValue === originalValue) return;

    const result = await delegate.updateMany({
      where: { id: row.id, [source.field]: { equals: originalValue } },
      data: { [source.field]: updatedValue },
    });

    if (result.count === 1) {
      this.stats.updatedRows += 1;
      return;
    }

    this.stats.skippedRows += 1;
    this.logger.warn(`Skipped concurrently changed row: ${source.delegate}.${source.field} (${String(row.id)})`);
  }

  private async replaceUrls(value: unknown): Promise<unknown> {
    if (typeof value === "string") {
      if (!isImgbbUrl(value)) return value;

      try {
        return await this.migrateUrl(value);
      } catch (error) {
        if (error instanceof MigrationLimitReached || error instanceof AppException) throw error;

        const message = error instanceof Error ? error.message : String(error);
        this.failures.set(value, message);
        this.logger.warn(`Failed to migrate ${value}: ${message}`);
        if (error instanceof ImgbbRateLimitReached) throw error;
        return value;
      }
    }

    if (Array.isArray(value)) {
      let changed = false;
      const result: unknown[] = [];
      for (const item of value) {
        const updated = await this.replaceUrls(item);
        changed ||= updated !== item;
        result.push(updated);
      }
      return changed ? result : value;
    }

    if (value && typeof value === "object") {
      let changed = false;
      const result: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value)) {
        const updated = await this.replaceUrls(item);
        changed ||= updated !== item;
        result[key] = updated;
      }
      return changed ? result : value;
    }

    return value;
  }

  private async migrateUrl(sourceUrl: string): Promise<string> {
    const cached = this.urlMap.get(sourceUrl);
    if (cached) return cached;

    const previousFailure = this.failures.get(sourceUrl);
    if (previousFailure) throw new Error(previousFailure);

    if (this.processedImages >= this.maxImages) throw new MigrationLimitReached();
    this.processedImages += 1;

    const key = getImgbbMigrationKey(sourceUrl);

    if (await this.r2.objectExists(key)) {
      const targetUrl = this.r2.getObjectUrl(key);
      this.urlMap.set(sourceUrl, targetUrl);
      this.stats.reusedImages += 1;
      this.logger.log(`Reused R2 object for ${sourceUrl}`);
      return targetUrl;
    }

    const source = await this.download(sourceUrl);
    const webp = await convertImageToWebp(source, this.webpQuality);

    if (this.stats.uploadedBytes + webp.length > this.maxBytes) throw new MigrationLimitReached();

    const targetUrl = await this.r2.upload(webp, {
      key,
      contentType: WEBP_CONTENT_TYPE,
      cacheControl: "public, max-age=31536000, immutable",
    });

    this.urlMap.set(sourceUrl, targetUrl);
    this.stats.uploadedImages += 1;
    this.stats.uploadedBytes += webp.length;
    this.logger.log(`Uploaded ${sourceUrl} as WebP (${webp.length} bytes)`);
    return targetUrl;
  }

  private async download(sourceUrl: string): Promise<Buffer> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.downloadAttempts; attempt += 1) {
      await this.waitForDownloadSlot();

      try {
        this.lastDownloadAt = Date.now();
        const response = await axios.get<ArrayBuffer>(sourceUrl, {
          responseType: "arraybuffer",
          timeout: this.downloadTimeoutMs,
          maxContentLength: this.maxDownloadBytes,
          maxBodyLength: this.maxDownloadBytes,
        });
        return Buffer.from(response.data);
      } catch (error) {
        lastError = error;
        if (!this.isRetryableDownloadError(error) || attempt === this.downloadAttempts) break;

        const retryDelay = this.getRetryDelay(error, attempt);
        this.logger.warn(`Download attempt ${attempt} failed for ${sourceUrl}; retrying in ${retryDelay}ms`);
        await sleep(retryDelay);
      }
    }

    if (lastError instanceof AxiosError && lastError.response?.status === 429) {
      throw new ImgbbRateLimitReached("ImgBB rate limit persisted after retries");
    }

    throw lastError;
  }

  private async waitForDownloadSlot(): Promise<void> {
    const elapsed = Date.now() - this.lastDownloadAt;
    if (this.lastDownloadAt > 0 && elapsed < this.delayMs) await sleep(this.delayMs - elapsed);
  }

  private isRetryableDownloadError(error: unknown): boolean {
    if (!(error instanceof AxiosError)) return false;
    const status = error.response?.status;
    return !status || status === 408 || status === 429 || status >= 500;
  }

  private getRetryDelay(error: unknown, attempt: number): number {
    if (error instanceof AxiosError) {
      const retryAfter = error.response?.headers["retry-after"];
      if (typeof retryAfter === "string") {
        const seconds = Number(retryAfter);
        if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);

        const date = Date.parse(retryAfter);
        if (Number.isFinite(date)) return Math.max(0, date - Date.now());
      }
    }

    return Math.min(60_000, 1_000 * 2 ** (attempt - 1));
  }
}
