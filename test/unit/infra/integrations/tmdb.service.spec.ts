import {describe, it, expect, vi, beforeEach} from "vitest";
import {of, throwError} from "rxjs";
import {TMDBService} from "@/shared/infra/integrations/tmdb.service";
import {AppException} from "@/shared/exceptions/app.exceptions";

const mockHttpService = {
  get: vi.fn(),
  post: vi.fn(),
};

const mockConfigService = {
  get: vi.fn().mockReturnValue("fake-tmdb-key"),
};

const mockCacheService = {
  get: vi.fn(),
  set: vi.fn(),
};

describe("TMDBService", () => {
  let service: TMDBService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TMDBService(mockHttpService as any, mockConfigService as any, mockCacheService as any);
  });

  describe("searchMovies", () => {
    it("should return cached movies when cache hit", async () => {
      const cachedMovies = [{tmdbId: 1, name: "Inception", releaseDate: null, posterUrl: null}];
      mockCacheService.get.mockResolvedValue(cachedMovies);

      const result = await service.searchMovies({query: "Inception"});

      expect(result).toEqual(cachedMovies);
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });

    it("should fetch movies, map them and cache the result", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            results: [
              {
                id: 27205,
                title: "Inception",
                release_date: "2010-07-16",
                poster_path: "/poster.jpg",
              },
            ],
          },
        }),
      );

      const result = (await service.searchMovies({query: "Inception"})) as any;

      expect(result.items).toHaveLength(1);
      expect(result.items[0].tmdbId).toBe(27205);
      expect(result.items[0].name).toBe("Inception");
      expect(result.items[0].posterUrl).toBe("https://image.tmdb.org/t/p/w500/poster.jpg");
      expect(result.items[0].releaseDate).toBeInstanceOf(Date);
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it("should throw AppException when request fails", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockHttpService.get.mockReturnValue(throwError(() => new Error("Service down")));

      await expect(service.searchMovies({query: "Inception"})).rejects.toBeInstanceOf(AppException);
    });

    it("should throw AppException with 404 status when movie not found", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockHttpService.get.mockReturnValue(throwError(() => ({response: {status: 404}})));

      await expect(service.searchMovies({query: "unknown"})).rejects.toBeInstanceOf(AppException);
    });
  });

  describe("searchTVShows", () => {
    it("should return cached TV shows when cache hit", async () => {
      const cached = [{tmdbId: 1, name: "Breaking Bad", firstAirDate: null, posterUrl: null}];
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.searchTVShows({query: "Breaking Bad"});

      expect(result).toEqual(cached);
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });

    it("should fetch TV shows, map them and cache the result", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            results: [
              {
                id: 1396,
                name: "Breaking Bad",
                first_air_date: "2008-01-20",
                poster_path: "/poster.jpg",
              },
            ],
          },
        }),
      );

      const result = (await service.searchTVShows({query: "Breaking Bad"})) as any;

      expect(result.items).toHaveLength(1);
      expect(result.items[0].tmdbId).toBe(1396);
      expect(result.items[0].name).toBe("Breaking Bad");
      expect(result.items[0].posterUrl).toBe("https://image.tmdb.org/t/p/w500/poster.jpg");
      expect(result.items[0].firstAirDate).toBeInstanceOf(Date);
    });

    it("should throw AppException when request fails", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockHttpService.get.mockReturnValue(throwError(() => new Error("Service down")));

      await expect(service.searchTVShows({query: "Breaking Bad"})).rejects.toBeInstanceOf(AppException);
    });
  });

  describe("getMovieById", () => {
    const movieData = {
      id: 27205,
      imdb_id: "tt1375666",
      backdrop_path: "/backdrop.jpg",
      belongs_to_collection: null,
      budget: 160000000,
      genres: [{name: "Action"}],
      homepage: "https://inception.com",
      original_language: "en",
      original_title: "Inception",
      overview: "A thief...",
      popularity: 99.5,
      poster_path: "/poster.jpg",
      production_companies: [{logo_path: null, name: "Warner Bros", origin_country: "US"}],
      production_countries: [{name: "United States"}],
      release_date: "2010-07-16",
      revenue: 836836967,
      runtime: 148,
      spoken_languages: [{english_name: "English", name: "English", iso_639_1: "en"}],
      status: "Released",
      title: "Inception",
      video: false,
    };

    const movieDataWithCredits = {
      ...movieData,
      credits: {
        cast: [{id: 1, name: "Leonardo DiCaprio", character: "Cobb", profile_path: "/leo.jpg"}],
        crew: [{id: 2, name: "Christopher Nolan", job: "Director", profile_path: null}],
      },
    };

    it("should return cached movie when cache hit", async () => {
      const cached = {tmdbId: 27205, title: "Inception"};
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.getMovieById(27205);

      expect(result).toEqual(cached);
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });

    it("should fetch movie details, credits and cache the result", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockHttpService.get.mockReturnValueOnce(of({data: movieDataWithCredits}));

      const result = await service.getMovieById(27205);

      expect(result.tmdbId).toBe(27205);
      expect(result.title).toBe("Inception");
      expect(result.genres).toEqual(["Action"]);
      expect(result.cast).toHaveLength(1);
      expect(result.cast[0].name).toBe("Leonardo DiCaprio");
      expect(result.crew[0].job).toBe("Director");
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it("should throw AppException when request fails", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockHttpService.get.mockReturnValue(throwError(() => new Error("Service down")));

      await expect(service.getMovieById(99999)).rejects.toBeInstanceOf(AppException);
    });
  });

  describe("getTVShowById", () => {
    const tvShowData = {
      id: 1396,
      backdrop_path: "/backdrop.jpg",
      created_by: [{id: 1, name: "Vince Gilligan", profile_path: null}],
      episode_run_time: [47],
      first_air_date: "2008-01-20",
      genres: [{name: "Drama"}],
      homepage: "https://breakingbad.com",
      in_production: false,
      languages: ["en"],
      last_air_date: "2013-09-29",
      last_episode_to_air: null,
      name: "Breaking Bad",
      next_episode_to_air: null,
      networks: [{id: 174, name: "AMC", origin_country: "US", logo_path: null}],
      number_of_episodes: 62,
      number_of_seasons: 5,
      origin_country: ["US"],
      original_language: "en",
      original_name: "Breaking Bad",
      popularity: 200,
      poster_path: "/poster.jpg",
      production_companies: [],
      production_countries: [{name: "United States"}],
      status: "Ended",
      tagline: "Change the plan.",
      type: "Scripted",
    };

    const tvShowDataWithCredits = {
      ...tvShowData,
      credits: {
        cast: [{id: 17419, name: "Bryan Cranston", character: "Walter White", profile_path: "/bryan.jpg"}],
        crew: [],
      },
    };

    it("should return cached TV show when cache hit", async () => {
      const cached = {tmdbId: 1396, name: "Breaking Bad"};
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.getTVShowById(1396);

      expect(result).toEqual(cached);
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });

    it("should fetch TV show details and cache the result", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockHttpService.get.mockReturnValueOnce(of({data: tvShowDataWithCredits}));

      const result = await service.getTVShowById(1396);

      expect(result.tmdbId).toBe(1396);
      expect(result.name).toBe("Breaking Bad");
      expect(result.genres).toEqual(["Drama"]);
      expect(result.cast[0].name).toBe("Bryan Cranston");
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it("should throw AppException when request fails", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockHttpService.get.mockReturnValue(throwError(() => new Error("Service down")));

      await expect(service.getTVShowById(99999)).rejects.toBeInstanceOf(AppException);
    });
  });

  describe("getTVShowSeasonsById", () => {
    it("should return cached seasons when cache hit", async () => {
      const cached = [{id: 1, seasonNumber: 1, name: "Season 1"}];
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.getTVShowSeasonsById(1396);

      expect(result).toEqual(cached);
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });

    it("should fetch seasons and cache", async () => {
      const tvShowData = {
        seasons: [
          {
            id: 100,
            name: "Season 1",
            season_number: 1,
            episode_count: 7,
            air_date: "2008-01-20",
            poster_path: "/s1.jpg",
          },
        ],
      };

      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockHttpService.get.mockReturnValueOnce(of({ data: tvShowData }));

      const result = await service.getTVShowSeasonsById(1396);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Season 1");
      expect(result[0].seasonNumber).toBe(1);
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it("should throw AppException when request fails", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockHttpService.get.mockReturnValue(throwError(() => new Error("Service down")));

      await expect(service.getTVShowSeasonsById(99999)).rejects.toBeInstanceOf(AppException);
    });
  });
});
