import { ActivityType, ProgressStatus } from "@prisma/generated/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookProgressService } from "@/modules/book/service/book-progress.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { MediaFilterService } from "@/shared/media-filter/media-filter.service";
import { MediaReleaseService } from "@/shared/media-release/media-release.service";

describe("BookProgressService", () => {
  const database = { book: { findUnique: vi.fn() }, bookProgress: { findUnique: vi.fn(), upsert: vi.fn() } };
  const queue = { toActivityJob: vi.fn(), toXpJob: vi.fn() };
  const release = { assertProgressStatusAllowed: vi.fn() };
  const service = new BookProgressService(
    database as unknown as DatabaseService,
    queue as unknown as QueueService,
    {} as MediaFilterService,
    release as unknown as MediaReleaseService,
  );
  const input = { userId: "user-1", bookId: "book-1", status: ProgressStatus.Reading };

  beforeEach(() => {
    vi.clearAllMocks();
    database.bookProgress.findUnique.mockResolvedValue({ status: ProgressStatus.Reading, chaptersRead: 1 });
    database.bookProgress.upsert.mockResolvedValue({ id: "progress-1" });
    database.book.findUnique.mockResolvedValue({ numberOfPages: 300 });
  });

  it("records only newly read pages without recreating the started activity", async () => {
    await service.createOrUpdateBookProgress({ ...input, chaptersRead: 6 });

    expect(database.bookProgress.findUnique).toHaveBeenCalledWith({
      where: { userId_bookId: { userId: "user-1", bookId: "book-1" } },
      select: { status: true, chaptersRead: true, totalPages: true },
    });
    expect(queue.toActivityJob).toHaveBeenCalledExactlyOnceWith({
      type: ActivityType.ChaptersRead,
      userId: "user-1",
      bookProgressId: "progress-1",
      metadata: { id: "progress-1", from: 2, to: 6, count: 5 },
    });
  });

  it.each([undefined, 1, 0])("does not emit activities for unchanged or reduced pages (%s)", async (chaptersRead) => {
    await service.createOrUpdateBookProgress({ ...input, chaptersRead });

    expect(queue.toActivityJob).not.toHaveBeenCalled();
  });

  it("records the initial status and pages when creating progress", async () => {
    database.bookProgress.findUnique.mockResolvedValue(null);

    await service.createOrUpdateBookProgress({ ...input, chaptersRead: 1 });

    expect(queue.toActivityJob).toHaveBeenCalledTimes(2);
    expect(queue.toActivityJob).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: ActivityType.ProgressStarted }),
    );
    expect(queue.toActivityJob).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: ActivityType.ChaptersRead,
        bookProgressId: "progress-1",
        metadata: { id: "progress-1", from: 1, to: 1, count: 1 },
      }),
    );
  });

  it("records pages from the beginning when the previous count is unknown", async () => {
    database.bookProgress.findUnique.mockResolvedValue({ status: ProgressStatus.Reading, chaptersRead: null });

    await service.createOrUpdateBookProgress({ ...input, chaptersRead: 3 });

    expect(queue.toActivityJob).toHaveBeenCalledExactlyOnceWith({
      type: ActivityType.ChaptersRead,
      userId: "user-1",
      bookProgressId: "progress-1",
      metadata: { id: "progress-1", from: 1, to: 3, count: 3 },
    });
  });

  it("records completion alongside the final pages", async () => {
    await service.createOrUpdateBookProgress({ ...input, status: ProgressStatus.Completed, chaptersRead: 10 });

    expect(queue.toActivityJob).toHaveBeenCalledTimes(2);
    expect(queue.toActivityJob).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: ActivityType.ProgressCompleted }),
    );
    expect(queue.toActivityJob).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: ActivityType.ChaptersRead,
        bookProgressId: "progress-1",
        metadata: { id: "progress-1", from: 2, to: 10, count: 9 },
      }),
    );
  });

  it("snapshots the Hardcover total when creating progress without a custom total", async () => {
    database.bookProgress.findUnique.mockResolvedValue(null);

    await service.createOrUpdateBookProgress(input);

    expect(database.bookProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ totalPages: 300 }) }),
    );
  });

  it("accepts an edition with more pages than Hardcover", async () => {
    await service.createOrUpdateBookProgress({ ...input, totalPages: 500, chaptersRead: 400 });

    expect(database.book.findUnique).not.toHaveBeenCalled();
    expect(database.bookProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ totalPages: 500, chaptersRead: 400 }),
        update: expect.objectContaining({ totalPages: 500, chaptersRead: 400 }),
      }),
    );
  });

  it("preserves the saved edition total when a quick increment omits it", async () => {
    database.bookProgress.findUnique.mockResolvedValue({
      status: ProgressStatus.Reading,
      chaptersRead: 350,
      totalPages: 500,
    });

    await service.createOrUpdateBookProgress({ ...input, chaptersRead: 351 });

    expect(database.book.findUnique).not.toHaveBeenCalled();
    expect(database.bookProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ totalPages: 500, chaptersRead: 351 }) }),
    );
  });

  it("allows resetting to the Hardcover total without emitting a reading activity", async () => {
    database.bookProgress.findUnique.mockResolvedValue({
      status: ProgressStatus.Reading,
      chaptersRead: 1,
      totalPages: 500,
    });

    await service.createOrUpdateBookProgress({ ...input, totalPages: 300 });

    expect(database.bookProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ totalPages: 300, chaptersRead: undefined }) }),
    );
    expect(queue.toActivityJob).not.toHaveBeenCalled();
  });

  it.each([null, 0])("allows an unknown total when Hardcover has no valid page count (%s)", async (numberOfPages) => {
    database.bookProgress.findUnique.mockResolvedValue(null);
    database.book.findUnique.mockResolvedValue({ numberOfPages });

    await service.createOrUpdateBookProgress({ ...input, chaptersRead: 10 });

    expect(database.bookProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ totalPages: undefined }) }),
    );
  });

  it("accepts a custom total and zero pages when Hardcover has no page count", async () => {
    database.bookProgress.findUnique.mockResolvedValue(null);
    database.book.findUnique.mockResolvedValue({ numberOfPages: null });

    await service.createOrUpdateBookProgress({ ...input, totalPages: 200, chaptersRead: 0 });

    expect(database.bookProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ totalPages: 200, chaptersRead: 0 }) }),
    );
  });

  it.each([
    { totalPages: 100, chaptersRead: 101 },
    { totalPages: undefined, chaptersRead: 301 },
  ])("rejects pages beyond the effective total (%j)", async (progress) => {
    await expect(service.createOrUpdateBookProgress({ ...input, ...progress })).rejects.toEqual(
      new AppException(ERROR_CODES.INVALID_PAGES_READ),
    );

    expect(database.bookProgress.upsert).not.toHaveBeenCalled();
    expect(queue.toActivityJob).not.toHaveBeenCalled();
  });

  it("rejects a total below already read pages even when the page count is omitted", async () => {
    database.bookProgress.findUnique.mockResolvedValue({
      status: ProgressStatus.Reading,
      chaptersRead: 150,
      totalPages: 300,
    });

    await expect(service.createOrUpdateBookProgress({ ...input, totalPages: 100 })).rejects.toEqual(
      new AppException(ERROR_CODES.INVALID_PAGES_READ),
    );
    expect(database.bookProgress.upsert).not.toHaveBeenCalled();
  });
});
