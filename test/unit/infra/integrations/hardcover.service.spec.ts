import { describe, it, expect, vi, beforeEach } from "vitest";
import { of, throwError } from "rxjs";
import { HardcoverService } from "@/shared/infra/integrations/hardcover.service";
import { AppException } from "@/shared/exceptions/app.exceptions";

const mockHttpService = {
  post: vi.fn(),
};

const mockConfigService = {
  get: vi.fn().mockReturnValue("fake-hardcover-key"),
};

const mockCacheService = {
  get: vi.fn(),
  set: vi.fn(),
};

describe("HardcoverService", () => {
  let service: HardcoverService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new HardcoverService(
      mockHttpService as any,
      mockConfigService as any,
      mockCacheService as any,
    );
  });

  describe("searchBooks", () => {
    it("should return cached books when cache hit", async () => {
      const cached = [{ id: 1, title: "Dune", authors: ["Frank Herbert"] }];
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.searchBooks("Dune");

      expect(result).toEqual(cached);
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it("should fetch books, map them and cache the result", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockHttpService.post.mockReturnValue(
        of({
          data: {
            data: {
              search: {
                results: {
                  hits: [
                    {
                      document: {
                        id: "12345",
                        title: "Dune",
                        alternative_titles: [],
                        author_names: ["Frank Herbert"],
                        image: { url: "https://hardcover.app/dune.jpg" },
                        genres: ["Science Fiction"],
                      },
                    },
                  ],
                },
              },
            },
          },
        }),
      );

      const result = await service.searchBooks("Dune");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(12345);
      expect(result[0].title).toBe("Dune");
      expect(result[0].authors).toEqual(["Frank Herbert"]);
      expect(result[0].imageUrl).toBe("https://hardcover.app/dune.jpg");
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it("should throw AppException when request fails", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockHttpService.post.mockReturnValue(throwError(() => new Error("Service down")));

      await expect(service.searchBooks("Dune")).rejects.toBeInstanceOf(AppException);
    });

    it("should throw AppException on 404 response", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockHttpService.post.mockReturnValue(throwError(() => ({ response: { status: 404 } })));

      await expect(service.searchBooks("unknown")).rejects.toBeInstanceOf(AppException);
    });
  });

  describe("getBookById", () => {
    const bookCategoriesData = [
      { id: 1, name: "Fiction" },
    ];

    const bookData = {
      id: 12345,
      title: "Dune",
      alternative_titles: ["Dune Messiah"],
      audio_seconds: null,
      taggings: [],
      book_category_id: 1,
      bookStatus: null,
      canonical: null,
      compilation: false,
      curation_status: null,
      default_audio_edition: null,
      default_cover_edition: {
        id: 100,
        image: { url: "https://hardcover.app/dune-cover.jpg" },
        title: "Dune",
        language: { language: "English" },
      },
      default_ebook_edition: null,
      default_physical_edition: null,
      description: "A legendary sci-fi novel.",
      editions: [],
      editions_count: 50,
      featured_book_series: null,
      headline: "The greatest sci-fi novel ever written.",
      image: { url: "https://hardcover.app/dune.jpg" },
      links: {},
      literary_type_id: 1,
      pages: 412,
      release_date: "1965-08-01",
      release_year: 1965,
      slug: "dune",
      state: "published",
      subtitle: null,
    };

    it("should return cached book when cache hit", async () => {
      const cached = { hardcoverId: 12345, title: "Dune" };
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.getBookById(12345);

      expect(result).toEqual(cached);
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it("should fetch book details and cache the result", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockHttpService.post
        .mockReturnValueOnce(of({ data: { data: { book_categories: bookCategoriesData } } }))
        .mockReturnValueOnce(of({ data: { data: { books_by_pk: bookData } } }));

      const result = await service.getBookById(12345);

      expect(result.hardcoverId).toBe(12345);
      expect(result.title).toBe("Dune");
      expect(result.numberOfPages).toBe(412);
      expect(result.releaseDate).toBeInstanceOf(Date);
      expect(result.bookCategory?.name).toBe("Fiction");
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it("should throw AppException when request fails", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockHttpService.post.mockReturnValue(throwError(() => new Error("Service down")));

      await expect(service.getBookById(12345)).rejects.toBeInstanceOf(AppException);
    });

    it("should throw AppException on 404 response", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockHttpService.post.mockReturnValue(throwError(() => ({ response: { status: 404 } })));

      await expect(service.getBookById(99999)).rejects.toBeInstanceOf(AppException);
    });
  });
});
