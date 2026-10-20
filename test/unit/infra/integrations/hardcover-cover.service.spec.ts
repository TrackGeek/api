import { of } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HardcoverService } from "@/shared/infra/integrations/hardcover.service";

const http = { post: vi.fn() };
const config = { get: vi.fn().mockReturnValue("key") };
const cache = { get: vi.fn(), set: vi.fn() };

describe("Hardcover edition covers", () => {
  let service: HardcoverService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new HardcoverService(http as any, config as any, cache as any);
    cache.get.mockResolvedValue(null);
    cache.set.mockResolvedValue(undefined);
  });

  it("reuses cached covers and cached missing editions without contacting Hardcover", async () => {
    cache.get
      .mockResolvedValueOnce({ cover: { editionId: 9, imageUrl: "pt.jpg" } })
      .mockResolvedValueOnce({ cover: null });
    const covers = await service.getLocalizedBookCovers([1, 2], "pt");
    expect(covers.get(1)?.imageUrl).toBe("pt.jpg");
    expect(covers.get(2)).toBeNull();
    expect(http.post).not.toHaveBeenCalled();
  });

  it("batches uncached books and caches both matches and missing covers by language", async () => {
    http.post.mockReturnValue(
      of({
        data: {
          data: {
            books: [
              { id: 1, editions: [{ id: 9, image: { url: "pt.jpg" } }] },
              { id: 2, editions: [] },
            ],
          },
        },
      }),
    );
    const covers = await service.getLocalizedBookCovers([1, 2], "pt");
    expect(covers.get(1)).toEqual({ editionId: 9, imageUrl: "pt.jpg" });
    expect(covers.get(2)).toBeNull();
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post.mock.calls[0][1].variables).toEqual({ ids: [1, 2], language: "pt", limit: 2 });
    expect(cache.set).toHaveBeenCalledWith("hardcover:cover:book:2:pt", { cover: null }, expect.any(Number));
  });

  it("does not cache GraphQL errors as missing covers", async () => {
    http.post.mockReturnValue(of({ data: { errors: [{ message: "Unavailable" }] } }));
    await expect(service.getLocalizedBookCovers([1], "pt")).rejects.toThrow();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it("checks edition ownership before returning its cover", async () => {
    http.post.mockReturnValue(of({ data: { data: { editions: [] } } }));
    await expect(service.getBookEditionCover(1, 9)).resolves.toBeNull();
    expect(http.post.mock.calls[0][1].variables).toEqual({ bookId: 1, editionId: 9 });
    http.post.mockReturnValue(of({ data: { data: { editions: [{ image: { url: "edition.jpg" } }] } } }));
    await expect(service.getBookEditionCover(1, 10)).resolves.toBe("edition.jpg");
  });
});
