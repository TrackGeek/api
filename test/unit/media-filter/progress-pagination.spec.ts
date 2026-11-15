import { describe, expect, it, vi } from "vitest";
import { ProgressSortBy, ProgressSortOrder } from "@/shared/media-filter/media-filter.constants";
import { paginateProgress } from "@/shared/media-filter/progress-pagination";

function setup() {
  const rows = [
    { id: "unrated", userId: "owner", movieId: "m0", status: "Completed" },
    { id: "low", userId: "owner", movieId: "m1", status: "Completed" },
    { id: "tie-b", userId: "owner", movieId: "m2", status: "Completed" },
    { id: "tie-a", userId: "owner", movieId: "m3", status: "Completed" },
  ];
  const db = {
    offsetPagination: vi.fn(),
    movieProgress: {
      findMany: vi.fn().mockImplementation(async (query) => {
        if (query.select) return rows;
        return rows.filter((row) => query.where.AND[1].id.in.includes(row.id));
      }),
    },
    movieReview: {
      findMany: vi.fn().mockResolvedValue([
        { userId: "owner", movieId: "m1", overall: 4 },
        { userId: "owner", movieId: "m2", overall: 9 },
        { userId: "owner", movieId: "m3", overall: 9 },
      ]),
    },
  };
  return db;
}

describe("paginateProgress", () => {
  it("preserves existing pagination for other sorts", async () => {
    const db = setup();
    const params = { model: "movieProgress" as const, where: { userId: "owner" } };
    await paginateProgress(db as any, {}, params);
    expect(db.offsetPagination).toHaveBeenCalledWith(params);
    expect(db.movieProgress.findMany).not.toHaveBeenCalled();
  });

  it("sorts personal ratings before pagination with stable ties and unrated last", async () => {
    const db = setup();
    const params = {
      model: "movieProgress" as const,
      where: { userId: "owner", status: "Completed", movie: { title: { contains: "film" } } },
      itemsPerPage: 2,
      page: 1,
      include: { movie: true },
    };
    const first = await paginateProgress(db as any, { sortBy: ProgressSortBy.Rating }, params);
    expect(first.items.map((item) => item.id)).toEqual(["tie-a", "tie-b"]);
    expect(first).toMatchObject({ total: 4, pages: 2, itemsInPage: 2, inPage: 1 });
    expect(db.movieProgress.findMany.mock.calls[0][0].where).toEqual(params.where);
    expect(db.movieReview.findMany.mock.calls[0][0].where).toEqual({
      userId: { in: ["owner"] },
      movieId: { in: ["m0", "m1", "m2", "m3"] },
    });
    const second = await paginateProgress(db as any, { sortBy: ProgressSortBy.Rating }, { ...params, page: 2 });
    expect(second.items.map((item) => item.id)).toEqual(["low", "unrated"]);
  });

  it("keeps unrated last in ascending order", async () => {
    const db = setup();
    const result = await paginateProgress(
      db as any,
      { sortBy: ProgressSortBy.Rating, sortOrder: ProgressSortOrder.Asc },
      { model: "movieProgress" },
    );
    expect(result.items.map((item) => item.id)).toEqual(["low", "tie-a", "tie-b", "unrated"]);
  });

  it("returns empty page without loading hydrated rows", async () => {
    const db = setup();
    const result = await paginateProgress(
      db as any,
      { sortBy: ProgressSortBy.Rating },
      { model: "movieProgress", page: 9 },
    );
    expect(result.items).toEqual([]);
    expect(result.itemsInPage).toBe(0);
    expect(db.movieProgress.findMany).toHaveBeenCalledTimes(1);
  });
});
