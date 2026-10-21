import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookCoverService } from "@/modules/book/service/book-cover.service";

const database = {
  book: { findUnique: vi.fn() },
  bookCoverPreference: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
};
const hardcover = { getBookEditionCover: vi.fn(), getLocalizedBookCovers: vi.fn() };

describe("BookCoverService", () => {
  let service: BookCoverService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new BookCoverService(database as any, hardcover as any);
    database.book.findUnique.mockResolvedValue({ id: "book-1" });
    database.bookCoverPreference.findMany.mockResolvedValue([]);
    hardcover.getLocalizedBookCovers.mockResolvedValue(new Map());
  });

  it("persists only a validated edition cover for the authenticated user", async () => {
    hardcover.getBookEditionCover.mockResolvedValue("edition.jpg");
    await expect(service.setCover("reader", 123, 456)).resolves.toEqual({ editionId: 456, imageUrl: "edition.jpg" });
    expect(hardcover.getBookEditionCover).toHaveBeenCalledWith(123, 456);
    expect(database.bookCoverPreference.upsert).toHaveBeenCalledWith({
      where: { userId_bookId: { userId: "reader", bookId: "book-1" } },
      create: { userId: "reader", bookId: "book-1", editionId: 456, imageUrl: "edition.jpg" },
      update: { editionId: 456, imageUrl: "edition.jpg" },
    });
  });

  it("rejects editions without a cover or belonging to another book", async () => {
    hardcover.getBookEditionCover.mockResolvedValue(null);
    await expect(service.setCover("reader", 123, 456)).rejects.toMatchObject({
      response: { code: { code: "INVALID_BOOK_COVER" } },
    });
    expect(database.bookCoverPreference.upsert).not.toHaveBeenCalled();
  });

  it("rejects missing books before contacting Hardcover", async () => {
    database.book.findUnique.mockResolvedValue(null);
    await expect(service.setCover("reader", 123, 456)).rejects.toMatchObject({
      response: { code: { code: "BOOK_NOT_FOUND" } },
    });
    expect(hardcover.getBookEditionCover).not.toHaveBeenCalled();
  });

  it("prioritizes personal covers and batches only remaining unique books by language", async () => {
    database.bookCoverPreference.findMany.mockResolvedValue([
      { editionId: 10, imageUrl: "personal.jpg", book: { hardcoverId: 1 } },
    ]);
    hardcover.getLocalizedBookCovers.mockResolvedValue(new Map([[2, { editionId: 20, imageUrl: "portuguese.jpg" }]]));
    const covers = await service.resolveCovers([1, 2, 2, 3], "pt-PT", "reader");
    expect(covers.get(1)).toEqual({ editionId: 10, imageUrl: "personal.jpg", custom: true });
    expect(covers.get(2)).toEqual({ editionId: 20, imageUrl: "portuguese.jpg", custom: false });
    expect(covers.has(3)).toBe(false);
    expect(hardcover.getLocalizedBookCovers).toHaveBeenCalledWith([2, 3], "pt");
    expect(database.bookCoverPreference.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "reader", book: { hardcoverId: { in: [1, 2, 3] } } },
      }),
    );
  });

  it("localizes anonymous visitors without loading personal preferences", async () => {
    await service.resolveCovers([1], "pt-BR");
    expect(database.bookCoverPreference.findMany).not.toHaveBeenCalled();
    expect(hardcover.getLocalizedBookCovers).toHaveBeenCalledWith([1], "pt");
  });

  it("keeps personal covers when Hardcover is unavailable", async () => {
    database.bookCoverPreference.findMany.mockResolvedValue([
      { editionId: 10, imageUrl: "personal.jpg", book: { hardcoverId: 1 } },
    ]);
    hardcover.getLocalizedBookCovers.mockRejectedValue(new Error("Unavailable"));
    const covers = await service.resolveCovers([1, 2], "en-US", "reader");
    expect(covers.get(1)?.imageUrl).toBe("personal.jpg");
    expect(covers.has(2)).toBe(false);
  });

  it("resets only the authenticated user's preference and allows repeated resets", async () => {
    await service.resetCover("reader", 123);
    expect(database.bookCoverPreference.deleteMany).toHaveBeenCalledWith({
      where: { userId: "reader", book: { hardcoverId: 123 } },
    });
  });
});
