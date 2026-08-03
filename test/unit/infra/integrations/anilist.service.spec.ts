import { of, throwError } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { AnilistMangaFilter, AnilistService } from "@/shared/infra/integrations/anilist.service";

const mockHttpService = {
  post: vi.fn(),
};

const mockCacheService = {
  get: vi.fn(),
  set: vi.fn(),
};

const media = {
  id: 30013,
  idMal: 11,
  siteUrl: "https://anilist.co/manga/30013",
  type: "MANGA",
  format: "MANGA",
  status: "FINISHED",
  description: "Naruto <br>manga...",
  startDate: { year: 1999, month: 9, day: 21 },
  endDate: { year: 2014, month: 11, day: 10 },
  chapters: 700,
  volumes: 72,
  countryOfOrigin: "JP",
  source: "ORIGINAL",
  isAdult: false,
  averageScore: 79,
  popularity: 42000,
  favourites: 5000,
  genres: ["Action", "Adventure"],
  synonyms: ["NARUTO"],
  title: { romaji: "NARUTO", english: "Naruto", native: "NARUTO -ナルト-" },
  coverImage: { extraLarge: "https://anilist.co/naruto.jpg", large: "https://anilist.co/naruto-large.jpg" },
  bannerImage: null,
};

const mangaDetails = {
  ...media,
  tags: [
    { name: "Shounen", rank: 90, isMediaSpoiler: false },
    { name: "Ninja", rank: 85, isMediaSpoiler: false },
    { name: "Plot Twist", rank: 60, isMediaSpoiler: true },
  ],
  externalLinks: [{ site: "Official Site", url: "https://naruto.com" }],
  staff: { edges: [{ role: "Story & Art", node: { id: 96879, name: { full: "Masashi Kishimoto" }, image: null } }] },
  characters: { edges: [{ role: "MAIN", node: { id: 17, name: { full: "Naruto Uzumaki" }, image: { large: null } } }] },
  relations: {
    edges: [
      {
        relationType: "ADAPTATION",
        node: {
          id: 20,
          idMal: 20,
          type: "ANIME",
          format: "TV",
          title: { romaji: "NARUTO", english: "Naruto" },
          coverImage: { large: "https://anilist.co/naruto-anime.jpg" },
        },
      },
    ],
  },
};

describe("AnilistService", () => {
  let service: AnilistService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AnilistService(mockHttpService as any, mockCacheService as any);
  });

  describe("topMangas", () => {
    it("should return cached mangas when cache hit", async () => {
      const cached = { total: 1, pages: 1, inPage: 1, itemsInPage: 1, itemsPerPage: 25, items: [] };
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.topMangas({ filter: AnilistMangaFilter.ByPopularity });

      expect(result).toEqual(cached);
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it("should fetch mangas, map them and cache the result", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockHttpService.post.mockReturnValue(
        of({
          data: {
            data: {
              Page: {
                pageInfo: { total: 1, perPage: 25, currentPage: 1, lastPage: 1 },
                media: [media],
              },
            },
          },
        }),
      );

      const result = await service.topMangas({ filter: AnilistMangaFilter.ByPopularity });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].anilistId).toBe(30013);
      expect(result.items[0].malId).toBe(11);
      expect(result.items[0].title).toBe("Naruto");
      expect(result.items[0].anilistScore).toBe(7.9);
      expect(result.items[0].status).toBe("Finished");
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it("should throw AppException when request fails", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockHttpService.post.mockReturnValue(throwError(() => new Error("Service down")));

      await expect(service.topMangas({ filter: AnilistMangaFilter.ByPopularity })).rejects.toBeInstanceOf(AppException);
    });
  });

  describe("getMangaById", () => {
    it("should return cached manga when cache hit", async () => {
      const cached = { anilistId: 30013, title: "Naruto" };
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.getMangaById(30013);

      expect(result).toEqual(cached);
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it("should map details, split tags from demographics and build the relations graph", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockHttpService.post.mockReturnValue(of({ data: { data: { Media: mangaDetails } } }));

      const result = await service.getMangaById(30013);

      expect(result.anilistId).toBe(30013);
      expect(result.type).toBe("Manga");
      expect(result.synopsis).toBe("Naruto \nmanga...");
      expect(result.published.string).toBe("Sep 21, 1999 to Nov 10, 2014");
      expect(result.authors[0].name).toBe("Masashi Kishimoto");
      expect(result.demographics).toEqual(["Shounen"]);
      expect(result.themes).toEqual(["Ninja"]);
      expect(result.relations.nodes[0].relationShip).toBe("Now");
      expect(result.relations.nodes[1].link).toBe("/anime/20");
      expect(result.relations.edges[0]).toEqual({ id: "30013-20", source: "30013", target: "20" });
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it("should throw AppException when the manga does not exist", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockHttpService.post.mockReturnValue(throwError(() => ({ response: { status: 404 } })));

      await expect(service.getMangaById(1)).rejects.toBeInstanceOf(AppException);
    });
  });
});
