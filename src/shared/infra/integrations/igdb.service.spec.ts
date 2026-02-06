import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { of, throwError } from "rxjs";

import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { CacheService } from "../cache/cache.service";
import { IGDBService } from "./igdb.service";

describe("IGDBService", () => {
	let service: IGDBService;
	let httpService: HttpService;
	let configService: ConfigService;
	let cacheService: CacheService;

	beforeEach(() => {
		httpService = {
			post: jest.fn(),
		} as unknown as HttpService;

		configService = {
			get: jest.fn((key: string) => {
				switch (key) {
					case "IGDB_CLIENT_ID":
						return "client-id";
					case "IGDB_CLIENT_SECRET":
						return "client-secret";
					default:
						return null;
				}
			}),
		} as unknown as ConfigService;

		cacheService = {
			get: jest.fn(),
			set: jest.fn(),
		} as unknown as CacheService;

		service = new IGDBService(httpService, configService, cacheService);
	});

	it("returns cached games without calling IGDB", async () => {
		const query = "zelda";
		const cachedGames = [{ id: 1, name: "Cached" }];

		(cacheService.get as jest.Mock).mockImplementation((key: string) => {
			if (key === "igdb:accessToken") {
				return "token";
			}
			if (key === `igdb:search:games:${query}`) {
				return cachedGames;
			}
			return null;
		});

		const result = await service.searchGames(query);

		expect(result).toEqual(cachedGames);
		expect(httpService.post).not.toHaveBeenCalled();
		expect(cacheService.set).not.toHaveBeenCalled();
	});

	it("fetches token and games and caches results", async () => {
		const query = "mario";

		(cacheService.get as jest.Mock).mockResolvedValue(null);
		(httpService.post as jest.Mock).mockImplementation((url: string) => {
			if (url.includes("oauth2/token")) {
				return of({ data: { access_token: "token", expires_in: 1000 } });
			}

			return of({
				data: [
					{
						id: 10,
						slug: "super-mario",
						name: "Super Mario",
						cover: { url: "//images/t_thumb.jpg" },
						platforms: [{ checksum: "p1", name: "Switch" }],
						involved_companies: [
							{
								checksum: "c1",
								company: { name: "Nintendo" },
								developer: true,
							},
						],
						first_release_date: 1700000000,
					},
				],
			});
		});

		const result = await service.searchGames(query);

		expect(httpService.post).toHaveBeenCalledTimes(2);
		expect(cacheService.set).toHaveBeenCalledWith(
			"igdb:accessToken",
			"token",
			700,
		);
		expect(cacheService.set).toHaveBeenCalledWith(
			`igdb:search:games:${query}`,
			expect.any(Array),
			21600,
		);

		expect(result).toEqual([
			{
				id: 10,
				slug: "super-mario",
				name: "Super Mario",
				involvedCompanies: [
					{
						checksum: "c1",
						companyName: "Nintendo",
						developer: true,
					},
				],
				platforms: [{ checksum: "p1", name: "Switch" }],
				coverUrl: "https://images/t_cover_big.jpg",
				firstReleaseDate: new Date(1700000000 * 1000),
			},
		]);
	});

	it("throws AppException when IGDB token fetch fails", async () => {
		(cacheService.get as jest.Mock).mockResolvedValue(null);
		(httpService.post as jest.Mock).mockReturnValue(
			throwError(() => new Error("token failed")),
		);

		await expect(service.searchGames("fail")).rejects.toBeInstanceOf(
			AppException,
		);
	});

	it("returns mapped game by slug", async () => {
		(cacheService.get as jest.Mock).mockImplementation((key: string) => {
			if (key === "igdb:accessToken") {
				return "token";
			}
			return null;
		});

		(httpService.post as jest.Mock).mockReturnValue(
			of({
				data: [
					{
						id: 123,
						age_ratings: [
							{
								rating_category: { rating: 5 },
								synopsis: "Teen",
								organization: { name: "ESRB" },
							},
						],
						alternative_names: [{ checksum: "a1", name: "Alt", comment: "C" }],
						artworks: [
							{
								checksum: "aw1",
								artwork_type: { name: "Key Art" },
								url: "//images/t_thumb.jpg",
							},
						],
						cover: { url: "//images/t_thumb.jpg" },
						first_release_date: 1700000000,
						name: "Game",
						slug: "game",
						platforms: [{ checksum: "p1", name: "PC" }],
						videos: [{ checksum: "v1", name: "Trailer", video_id: "abc" }],
					},
				],
			}),
		);

		const result = await service.getGameBySlug("game");

		expect(result).toMatchObject({
			igdbId: 123,
			name: "Game",
			slug: "game",
			coverUrl: "https://images/t_cover_big.jpg",
			firstReleaseDate: new Date(1700000000 * 1000),
			platforms: [{ checksum: "p1", name: "PC" }],
			ageRatings: [{ category: 5, synopsis: "Teen", organization: "ESRB" }],
			alternativeNames: [{ checksum: "a1", name: "Alt", comment: "C" }],
			artworks: [
				{
					checksum: "aw1",
					type: "Key Art",
					url: "https://images/t_1080p.jpg",
				},
			],
			videos: [
				{
					checksum: "v1",
					name: "Trailer",
					videoId: "https://www.youtube.com/embed/abc",
				},
			],
		});
	});

	it("throws IGDB_GAME_NOT_FOUND when slug not found", async () => {
		(cacheService.get as jest.Mock).mockImplementation((key: string) => {
			if (key === "igdb:accessToken") {
				return "token";
			}
			return null;
		});

		(httpService.post as jest.Mock).mockReturnValue(of({ data: [] }));

		await expect(service.getGameBySlug("missing")).rejects.toMatchObject({
			response: { code: ERROR_CODES.IGDB_GAME_NOT_FOUND.message },
		});
	});
});
