import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListService } from "@/modules/list/service/list.service";

describe("ListService item order", () => {
  const db = { list: { findUnique: vi.fn() }, offsetPagination: vi.fn() };
  const service = new ListService(db as any, {} as any);

  beforeEach(() => {
    vi.resetAllMocks();
    db.list.findUnique.mockResolvedValue({ id: "list" });
    db.offsetPagination.mockResolvedValue({ items: [], pages: 0 });
  });

  it("paginates by imported position with stable tie-breaking and unpositioned items last", async () => {
    await service.getItemsByListId({ listId: "list", page: 2, itemsPerPage: 18 });
    expect(db.offsetPagination).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { listId: "list" },
        page: 2,
        itemsPerPage: 18,
        orderBy: [{ position: { sort: "asc", nulls: "last" } }, { id: "asc" }],
      }),
    );
  });

  it("does not paginate a list that no longer exists", async () => {
    db.list.findUnique.mockResolvedValueOnce(null);
    await expect(service.getItemsByListId({ listId: "missing" })).rejects.toThrow();
    expect(db.offsetPagination).not.toHaveBeenCalled();
  });
});
