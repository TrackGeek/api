import { describe, it, expect, vi, beforeEach } from "vitest";
import { of, throwError } from "rxjs";
import { JikanService } from "@/shared/infra/integrations/jikan.service";
import { AppException } from "@/shared/exceptions/app.exceptions";

vi.mock("@/shared/utils/request", () => ({
  manyRequestWithDelay: vi.fn(),
}));

import { manyRequestWithDelay } from "@/shared/utils/request";

const mockHttpService = {
  get: vi.fn(),
};

const mockCacheService = {
  get: vi.fn(),
  set: vi.fn(),
};

describe("JikanService", () => {
  let service: JikanService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new JikanService(mockHttpService as any, mockCacheService as any);
  });

  describe("searchAnimes", () => {
    it("should return cached animes when cache hit", async () => {
      const cached = [{ malId: 1, title: "Naruto", type: "TV", airedFrom: null, imageUrl: null }];
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.searchAnimes("Naruto" as any);

      expect(result).toEqual(cached);
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });

    it("should fetch animes, map them and cache the result", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            data: [
              {
                mal_id: 20,
                title: "Naruto",
                type: "TV",
                aired: { from: "2002-10-03T00:00:00+00:00" },
                images: { jpg: { image_url: "https://cdn.myanimelist.net/naruto.jpg" } },
                genres: [],
                status: "Finished Airing",
              },
            ],
            pagination: { has_next_page: false, items: { total: 1, count: 1 } },
          },
        }),
      );

      const result = await service.searchAnimes({ query: "Naruto" });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].malId).toBe(20);
      expect(result.items[0].title).toBe("Naruto");
      expect(result.items[0].imageUrl).toBe("https://cdn.myanimelist.net/naruto.jpg");
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it("should throw AppException when request fails", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockHttpService.get.mockReturnValue(throwError(() => new Error("Service down")));

      await expect(service.searchAnimes("Naruto" as any)).rejects.toBeInstanceOf(AppException);
    });

    it("should throw AppException on 404 response", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockHttpService.get.mockReturnValue(throwError(() => ({ response: { status: 404 } })));

      await expect(service.searchAnimes("unknown" as any)).rejects.toBeInstanceOf(AppException);
    });
  });

  describe("searchMangas", () => {
    it("should return cached mangas when cache hit", async () => {
      const cached = [{ malId: 1, title: "Naruto", type: "Manga", publishedFrom: null, imageUrl: null }];
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.searchMangas("Naruto" as any);

      expect(result).toEqual(cached);
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });

    it("should fetch mangas, map them and cache the result", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            data: [
              {
                mal_id: 11,
                title: "Naruto",
                type: "Manga",
                published: { from: "1999-09-21T00:00:00+00:00" },
                images: { jpg: { image_url: "https://cdn.myanimelist.net/naruto-manga.jpg" } },
                genres: [],
                status: "Finished",
              },
            ],
            pagination: { has_next_page: false, items: { total: 1, count: 1 } },
          },
        }),
      );

      const result = await service.searchMangas({ query: "Naruto" });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].malId).toBe(11);
      expect(result.items[0].title).toBe("Naruto");
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it("should throw AppException when request fails", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockHttpService.get.mockReturnValue(throwError(() => new Error("Service down")));

      await expect(service.searchMangas("Naruto" as any)).rejects.toBeInstanceOf(AppException);
    });
  });

  describe("getAnimeById", () => {
    const animeFullData = {
      mal_id: 20,
      url: "https://myanimelist.net/anime/20",
      images: { jpg: { image_url: "https://cdn.myanimelist.net/naruto.jpg" } },
      trailer: { embed_url: null, youtube_id: null, url: null },
      title: "Naruto",
      titles: [],
      type: "TV",
      source: "Manga",
      episodes: 220,
      status: "Finished Airing",
      aired: { from: "2002-10-03T00:00:00+00:00", to: "2007-02-08T00:00:00+00:00" },
      duration: "23 min per ep",
      rating: "PG-13",
      rank: 500,
      popularity: 3,
      synopsis: "Naruto is a young ninja...",
      background: null,
      season: "fall",
      year: 2002,
      broadcast: null,
      producers: [],
      licensors: [],
      studios: [{ mal_id: 1, type: "anime", name: "Pierrot" }],
      genres: [{ name: "Action" }],
      explicit_genres: [],
      themes: [],
      demographics: [],
      external: [],
      relations: [],
    };

    it("should return cached anime when cache hit", async () => {
      const cached = { malId: 20, title: "Naruto" };
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.getAnimeById(20);

      expect(result).toEqual(cached);
      expect(manyRequestWithDelay).not.toHaveBeenCalled();
    });

    it("should fetch anime details and cache the result", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      vi.mocked(manyRequestWithDelay).mockResolvedValue([
        { data: { data: animeFullData } },
        { data: { data: [] } },
        { data: { data: [] } },
        { data: { data: { promo: [], music_videos: [] } } },
      ] as any);

      const result = await service.getAnimeById(20);

      expect(result.malId).toBe(20);
      expect(result.title).toBe("Naruto");
      expect(result.studios[0].name).toBe("Pierrot");
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it("should throw AppException when request fails", async () => {
      mockCacheService.get.mockResolvedValue(null);
      vi.mocked(manyRequestWithDelay).mockRejectedValue(new Error("Service down"));

      await expect(service.getAnimeById(20)).rejects.toBeInstanceOf(AppException);
    });

    it("should throw AppException on 404 response", async () => {
      mockCacheService.get.mockResolvedValue(null);
      vi.mocked(manyRequestWithDelay).mockRejectedValue({ response: { status: 404 } });

      await expect(service.getAnimeById(99999)).rejects.toBeInstanceOf(AppException);
    });
  });

  describe("getAnimeEpisodesById", () => {
    it("should return cached episodes when cache hit", async () => {
      const cached = [{ malId: 1, title: "Pilot", episodeNumber: 1, imageUrl: null }];
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.getAnimeEpisodesById(20);

      expect(result).toEqual(cached);
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });

    it("should fetch all episode pages and cache the result", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            data: [
              {
                mal_id: 1,
                title: "Enter: Naruto Uzumaki!",
                episode: "1",
                images: { jpg: { image_url: "https://cdn.myanimelist.net/ep1.jpg" } },
              },
            ],
            pagination: { has_next_page: false },
          },
        }),
      );

      const result = await service.getAnimeEpisodesById(20);

      expect(result).toHaveLength(1);
      expect(result[0].malId).toBe(1);
      expect(result[0].title).toBe("Enter: Naruto Uzumaki!");
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it("should throw AppException when request fails", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockHttpService.get.mockReturnValue(throwError(() => new Error("Service down")));

      await expect(service.getAnimeEpisodesById(20)).rejects.toBeInstanceOf(AppException);
    });
  });

  describe("getMangaById", () => {
    const mangaFullData = {
      mal_id: 11,
      url: "https://myanimelist.net/manga/11",
      images: { jpg: { image_url: "https://cdn.myanimelist.net/naruto-manga.jpg" } },
      title: "Naruto",
      titles: [],
      type: "Manga",
      chapters: 700,
      volumes: 72,
      status: "Finished",
      published: { from: "1999-09-21T00:00:00+00:00" },
      rank: 100,
      popularity: 5,
      synopsis: "Naruto manga...",
      authors: [{ mal_id: 1, type: "manga", name: "Masashi Kishimoto" }],
      serializations: [],
      genres: [{ name: "Action" }],
      explicit_genres: [],
      themes: [],
      demographics: [{ name: "Shounen" }],
      external: [],
      relations: [],
    };

    it("should return cached manga when cache hit", async () => {
      const cached = { malId: 11, title: "Naruto" };
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.getMangaById(11);

      expect(result).toEqual(cached);
      expect(manyRequestWithDelay).not.toHaveBeenCalled();
    });

    it("should fetch manga details and cache the result", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      vi.mocked(manyRequestWithDelay).mockResolvedValue([
        { data: { data: mangaFullData } },
        { data: { data: [] } },
      ] as any);

      const result = await service.getMangaById(11);

      expect(result.malId).toBe(11);
      expect(result.title).toBe("Naruto");
      expect(result.authors[0].name).toBe("Masashi Kishimoto");
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it("should throw AppException when request fails", async () => {
      mockCacheService.get.mockResolvedValue(null);
      vi.mocked(manyRequestWithDelay).mockRejectedValue(new Error("Service down"));

      await expect(service.getMangaById(11)).rejects.toBeInstanceOf(AppException);
    });
  });
});
