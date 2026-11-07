import axios, { AxiosError } from "axios";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  collectImgbbUrls,
  getImgbbMigrationKey,
  getMigrationSources,
  ImgbbR2Migration,
  type MigrationSource,
} from "../../../scripts/lib/imgbb-r2-migration";

vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, default: { get: vi.fn() } };
});

const sourceUrl = "https://i.ibb.co/abc123/screenshot.png";
const targetUrl = "https://images.trackgeek.test/migrated.webp";
const source: MigrationSource = {
  model: "Activity",
  delegate: "activity",
  field: "metadata",
  type: "Json",
};
const logger = { log: vi.fn(), warn: vi.fn() };

async function createPng(): Promise<Buffer> {
  return sharp({ create: { width: 2, height: 2, channels: 3, background: "#10b981" } })
    .png()
    .toBuffer();
}

function createDependencies(rows: Record<string, unknown>[]) {
  const database = {
    activity: {
      findMany: vi.fn().mockResolvedValue(rows),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const r2 = {
    objectExists: vi.fn().mockResolvedValue(false),
    getObjectUrl: vi.fn().mockReturnValue(targetUrl),
    upload: vi.fn().mockResolvedValue(targetUrl),
  };
  return { database, r2 };
}

describe("ImgbbR2Migration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finds ImgBB URLs recursively and ignores other hosts", () => {
    expect(collectImgbbUrls({ image: sourceUrl, nested: ["https://example.com/image.png", sourceUrl] })).toEqual([
      sourceUrl,
      sourceUrl,
    ]);
    expect(getImgbbMigrationKey(sourceUrl)).toMatch(/^migrations\/imgbb\/[a-f0-9]{64}\.webp$/);
  });

  it("only targets screenshots and profile avatar/banner", () => {
    expect(getMigrationSources()).toEqual([
      { model: "GameScreenshot", delegate: "gameScreenshot", field: "url", type: "String" },
      { model: "Profile", delegate: "profile", field: "avatarUrl", type: "String" },
      { model: "Profile", delegate: "profile", field: "bannerUrl", type: "String" },
    ]);
  });

  it("converts and uploads each distinct URL once, then updates every JSON reference", async () => {
    const rows = [{ id: "activity-1", metadata: { url: sourceUrl, nested: [sourceUrl] } }];
    const { database, r2 } = createDependencies(rows);
    vi.mocked(axios.get).mockResolvedValue({ data: await createPng() });

    const migration = new ImgbbR2Migration(database as any, r2 as any, {
      sources: [source],
      delayMs: 0,
      logger,
    });
    const stats = await migration.run();

    expect(axios.get).toHaveBeenCalledOnce();
    expect(r2.upload).toHaveBeenCalledOnce();
    expect(stats).toMatchObject({ updatedRows: 1, uniqueUrls: 1, uploadedImages: 1, failedUrls: 0 });
    expect(database.activity.updateMany.mock.calls[0][0].data.metadata).toEqual({
      url: targetUrl,
      nested: [targetUrl],
    });
  });

  it("reuses an existing deterministic R2 object without downloading or uploading", async () => {
    const rows = [{ id: "activity-1", metadata: { url: sourceUrl } }];
    const { database, r2 } = createDependencies(rows);
    r2.objectExists.mockResolvedValue(true);

    const migration = new ImgbbR2Migration(database as any, r2 as any, {
      sources: [source],
      delayMs: 0,
      logger,
    });
    const stats = await migration.run();

    expect(axios.get).not.toHaveBeenCalled();
    expect(r2.upload).not.toHaveBeenCalled();
    expect(stats).toMatchObject({ updatedRows: 1, reusedImages: 1, uploadedImages: 0 });
  });

  it("stops at the image limit so another run can continue", async () => {
    const rows = [
      { id: "activity-1", metadata: { url: sourceUrl } },
      { id: "activity-2", metadata: { url: "https://i.ibb.co/def456/other.jpg" } },
    ];
    const { database, r2 } = createDependencies(rows);
    vi.mocked(axios.get).mockResolvedValue({ data: await createPng() });

    const migration = new ImgbbR2Migration(database as any, r2 as any, {
      sources: [source],
      maxImages: 1,
      delayMs: 0,
      logger,
    });
    const stats = await migration.run();

    expect(stats.limitReached).toBe(true);
    expect(stats.updatedRows).toBe(1);
    expect(r2.upload).toHaveBeenCalledOnce();
  });

  it("stops downloading after persistent ImgBB rate limiting", async () => {
    const rows = [{ id: "activity-1", metadata: { url: sourceUrl } }];
    const { database, r2 } = createDependencies(rows);
    const error = new AxiosError("Too many requests");
    error.response = { status: 429, headers: {} } as any;
    vi.mocked(axios.get).mockRejectedValue(error);

    const migration = new ImgbbR2Migration(database as any, r2 as any, {
      sources: [source],
      delayMs: 0,
      downloadAttempts: 1,
      logger,
    });
    const stats = await migration.run();

    expect(stats).toMatchObject({ limitReached: true, failedUrls: 1, updatedRows: 0 });
    expect(axios.get).toHaveBeenCalledOnce();
    expect(database.activity.updateMany).not.toHaveBeenCalled();
  });

  it("counts candidates without network, R2, or database writes in dry-run mode", async () => {
    const rows = [{ id: "activity-1", metadata: { url: sourceUrl, nested: [sourceUrl] } }];
    const { database, r2 } = createDependencies(rows);

    const migration = new ImgbbR2Migration(database as any, r2 as any, {
      sources: [source],
      dryRun: true,
      logger,
    });
    const stats = await migration.run();

    expect(stats).toMatchObject({ matchedRows: 1, uniqueUrls: 1, updatedRows: 0 });
    expect(axios.get).not.toHaveBeenCalled();
    expect(r2.objectExists).not.toHaveBeenCalled();
    expect(database.activity.updateMany).not.toHaveBeenCalled();
  });
});
