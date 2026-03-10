import { describe, it, expect, vi, beforeEach } from "vitest";
import { of, throwError } from "rxjs";
import { IGDBService } from "@/shared/infra/integrations/igdb.service";
import { AppException } from "@/shared/exceptions/app.exceptions";

const mockHttpService = {
  get: vi.fn(),
  post: vi.fn(),
};

const mockConfigService = {
  get: vi.fn((key: string) => {
    const config: Record<string, string> = {
      IGDB_CLIENT_ID: "fake-client-id",
      IGDB_CLIENT_SECRET: "fake-client-secret",
    };
    return config[key] ?? null;
  }),
};

const mockCacheService = {
  get: vi.fn(),
  set: vi.fn(),
};

describe("IGDBService", () => {
  let service: IGDBService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new IGDBService(mockHttpService as any, mockConfigService as any, mockCacheService as any);
  });

  describe("searchGames", () => {
    const tokenResponse = { data: { access_token: "fake-token", expires_in: 5000000 } };

    it("should return cached games when cache hit", async () => {
      const cached = [{ igdbId: 1, name: "Elden Ring" }];
      mockCacheService.get.mockResolvedValueOnce("cached-access-token").mockResolvedValueOnce(cached);

      const result = await service.searchGames("Elden Ring");

      expect(result).toEqual(cached);
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it("should fetch games, map them and cache the result", async () => {
      mockCacheService.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockCacheService.set.mockResolvedValue(undefined);

      mockHttpService.post.mockReturnValueOnce(of(tokenResponse)).mockReturnValueOnce(
        of({
          data: [
            {
              id: 119171,
              slug: "elden-ring",
              name: "Elden Ring",
              cover: { url: "//images.igdb.com/igdb/image/upload/t_thumb/co4jni.jpg" },
              involved_companies: [{ checksum: "abc", company: { name: "FromSoftware" }, developer: true }],
              platforms: [{ checksum: "plat1", name: "PlayStation 5" }],
              first_release_date: 1645747200,
            },
          ],
        }),
      );

      const result = await service.searchGames("Elden Ring");

      expect(result).toHaveLength(1);
      expect(result[0].igdbId).toBe(119171);
      expect(result[0].name).toBe("Elden Ring");
      expect(result[0].coverUrl).toContain("t_cover_big");
      expect(result[0].involvedCompanies[0].companyName).toBe("FromSoftware");
      expect(result[0].firstReleaseDate).toBeInstanceOf(Date);
      expect(mockCacheService.set).toHaveBeenCalledTimes(2);
    });

    it("should use cached token when available", async () => {
      mockCacheService.get.mockResolvedValueOnce("cached-access-token").mockResolvedValueOnce(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockHttpService.post.mockReturnValue(
        of({
          data: [
            {
              id: 1,
              slug: "game",
              name: "Game",
              cover: null,
              involved_companies: null,
              platforms: null,
              first_release_date: null,
            },
          ],
        }),
      );

      await service.searchGames("Game");

      expect(mockHttpService.post).toHaveBeenCalledTimes(1);
    });

    it("should throw AppException when token request fails", async () => {
      mockCacheService.get.mockResolvedValueOnce(null);
      mockHttpService.post.mockReturnValue(throwError(() => new Error("Auth failed")));

      await expect(service.searchGames("Elden Ring")).rejects.toBeInstanceOf(AppException);
    });

    it("should throw AppException when games request fails", async () => {
      mockCacheService.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockHttpService.post
        .mockReturnValueOnce(of(tokenResponse))
        .mockReturnValueOnce(throwError(() => new Error("Service down")));

      await expect(service.searchGames("Elden Ring")).rejects.toBeInstanceOf(AppException);
    });
  });

  describe("getGameById", () => {
    const tokenResponse = { data: { access_token: "fake-token", expires_in: 5000000 } };

    const gameData = {
      id: 119171,
      slug: "elden-ring",
      name: "Elden Ring",
      cover: { url: "//images.igdb.com/igdb/image/upload/t_thumb/co4jni.jpg" },
      first_release_date: 1645747200,
      summary: "An epic RPG.",
      genres: [{ checksum: "g1", name: "RPG", slug: "rpg" }],
      platforms: [{ checksum: "p1", name: "PlayStation 5" }],
      involved_companies: [],
      age_ratings: [],
      alternative_names: [],
      artworks: [],
      bundles: [],
      checksum: "abc",
      collections: [],
      dlcs: [],
      expanded_games: [],
      expansions: [],
      external_games: [],
      forks: [],
      franchise: null,
      franchises: [],
      game_engines: [],
      game_localizations: [],
      game_modes: [],
      game_status: null,
      game_type: null,
      keywords: [],
      multiplayer_modes: [],
      parent_game: null,
      player_perspectives: [],
      ports: [],
      release_dates: [],
      remakes: [],
      remasters: [],
      screenshots: [],
      similar_games: [],
      standalone_expansions: [],
      version_parent: null,
      version_title: null,
      videos: [],
    };

    it("should return cached game when cache hit", async () => {
      const cached = { igdbId: 119171, name: "Elden Ring" };
      mockCacheService.get.mockResolvedValueOnce("cached-access-token").mockResolvedValueOnce(cached);

      const result = await service.getGameById(119171);

      expect(result).toEqual(cached);
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it("should fetch game details and cache the result", async () => {
      mockCacheService.get.mockResolvedValueOnce("cached-access-token").mockResolvedValueOnce(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockHttpService.post.mockReturnValue(of({ data: [gameData] }));

      const result = await service.getGameById(119171);

      expect(result.igdbId).toBe(119171);
      expect(result.name).toBe("Elden Ring");
      expect(result.genres[0].name).toBe("RPG");
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it("should throw AppException when game is not found in response", async () => {
      mockCacheService.get.mockResolvedValueOnce("cached-access-token").mockResolvedValueOnce(null);
      mockHttpService.post.mockReturnValue(of({ data: [] }));

      await expect(service.getGameById(99999)).rejects.toBeInstanceOf(AppException);
    });

    it("should throw AppException when request fails", async () => {
      mockCacheService.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockHttpService.post
        .mockReturnValueOnce(of(tokenResponse))
        .mockReturnValueOnce(throwError(() => new Error("Service down")));

      await expect(service.getGameById(119171)).rejects.toBeInstanceOf(AppException);
    });
  });
});
