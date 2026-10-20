import { Prisma } from "@prisma/generated/client";
import { describe, expect, it } from "vitest";
import { applyBookCovers, collectBookIds } from "@/modules/book/utils/book-cover-response";

const personalCover = { editionId: 9, imageUrl: "personal.jpg", custom: true };

describe("Book cover responses", () => {
  it("finds books across search, lists, favorites, progress and nested feed references", () => {
    const book = { hardcoverId: 1, imageUrl: "original.jpg" };
    const response = {
      items: [book, { book }, { metadata: { favorite: { book } } }],
      anime: { malId: 1, imageUrl: "anime.jpg" },
    };
    expect(collectBookIds(response)).toEqual([1, 1, 1]);
    const resolved = applyBookCovers(response, new Map([[1, personalCover]])) as typeof response;
    expect(resolved.items[0]).toMatchObject({ imageUrl: "personal.jpg", customCoverEditionId: 9 });
    expect(resolved.items[1]).toMatchObject({ book: { imageUrl: "personal.jpg" } });
    expect(resolved.items[2]).toMatchObject({ metadata: { favorite: { book: { imageUrl: "personal.jpg" } } } });
    expect(resolved.anime.imageUrl).toBe("anime.jpg");
    expect(book.imageUrl).toBe("original.jpg");
  });

  it("preserves editions and original fallback covers without changing shared data", () => {
    const book = { hardcoverId: 1, imageUrl: "original.jpg", editions: [{ id: 9, imageUrl: "edition.jpg" }] };
    expect(applyBookCovers(book, new Map())).toMatchObject({ imageUrl: "original.jpg", customCoverEditionId: null });
    const localized = applyBookCovers(book, new Map([[1, { ...personalCover, custom: false }]]));
    expect(localized).toMatchObject({ coverEditionId: 9, customCoverEditionId: null, editions: book.editions });
    expect(book.imageUrl).toBe("original.jpg");
  });

  it("preserves Decimal and Date instances used by Prisma serialization", () => {
    const rating = new Prisma.Decimal("4.5");
    const date = new Date();
    const resolved = applyBookCovers({ rating, date }, new Map()) as { rating: Prisma.Decimal; date: Date };
    expect(resolved.rating).toBe(rating);
    expect(resolved.date).toBe(date);
    expect(collectBookIds({ rating, date })).toEqual([]);
  });
});
