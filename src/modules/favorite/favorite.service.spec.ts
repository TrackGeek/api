import { Test, TestingModule } from "@nestjs/testing";
import { FavoriteType, FeedEventType } from "@prisma/generated/enums";

import { FavoriteService } from "./favorite.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AddFavoriteDto } from "./dtos/add-favorite.dto";
import { RemoveFavoriteDto } from "./dtos/remove-favorite.dto";
import { GetFavoritesByUserIdDto } from "./dtos/get-favorites-by-user-id.dto";

jest.mock("@prisma/generated/client", () => ({}));

jest.mock("@/shared/infra/database/database.service", () => ({
	DatabaseService: jest.fn(),
}));

jest.mock("@/shared/infra/queue/queue.service", () => ({
	QueueService: jest.fn(),
}));

const mockDatabaseService = {
	favorite: {
		findFirst: jest.fn(),
		create: jest.fn(),
		delete: jest.fn(),
	},
	user: {
		findUnique: jest.fn(),
	},
	offsetPagination: jest.fn(),
};

const mockQueueService = {
	toFeedEventQueue: jest.fn(),
};

describe("FavoriteService", () => {
	let service: FavoriteService;
	let database: typeof mockDatabaseService;
	let queue: typeof mockQueueService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				FavoriteService,
				{ provide: DatabaseService, useValue: mockDatabaseService },
				{ provide: QueueService, useValue: mockQueueService },
			],
		}).compile();

		service = module.get<FavoriteService>(FavoriteService);
		database = module.get(DatabaseService);
		queue = module.get(QueueService);

		jest.clearAllMocks();
	});

	describe("addFavorite", () => {
		const dto: AddFavoriteDto = {
			type: FavoriteType.Anime,
			userId: "user-uuid-1",
			item: { animeId: "anime-uuid-1" },
		};

		it("should add a favorite successfully", async () => {
			database.favorite.findFirst.mockResolvedValue(null);
			const createdFavorite = { id: "fav-uuid-1", ...dto, user: {}, anime: {} };
			database.favorite.create.mockResolvedValue(createdFavorite);
			queue.toFeedEventQueue.mockResolvedValue(undefined);

			await service.addFavorite(dto);

			expect(database.favorite.findFirst).toHaveBeenCalledWith({
				where: {
					type: FavoriteType.Anime,
					userId: "user-uuid-1",
					animeId: "anime-uuid-1",
				},
			});

			expect(database.favorite.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: {
						type: FavoriteType.Anime,
						userId: "user-uuid-1",
						animeId: "anime-uuid-1",
					},
				}),
			);

			expect(queue.toFeedEventQueue).toHaveBeenCalledWith({
				type: FeedEventType.NewFavorite,
				userId: "user-uuid-1",
				metadata: { favorite: createdFavorite },
			});
		});

		it("should throw FAVORITE_ALREADY_EXISTS when favorite already exists", async () => {
			database.favorite.findFirst.mockResolvedValue({ id: "existing-fav" });

			await expect(service.addFavorite(dto)).rejects.toThrow(AppException);
			await expect(service.addFavorite(dto)).rejects.toThrow(
				expect.objectContaining({
					response: { code: ERROR_CODES.FAVORITE_ALREADY_EXISTS.message },
				}),
			);

			expect(database.favorite.create).not.toHaveBeenCalled();
			expect(queue.toFeedEventQueue).not.toHaveBeenCalled();
		});

		it("should handle different favorite types (Movie)", async () => {
			const movieDto: AddFavoriteDto = {
				type: FavoriteType.Movie,
				userId: "user-uuid-1",
				item: { movieId: "movie-uuid-1" },
			};

			database.favorite.findFirst.mockResolvedValue(null);
			database.favorite.create.mockResolvedValue({
				id: "fav-uuid-2",
				...movieDto,
			});
			queue.toFeedEventQueue.mockResolvedValue(undefined);

			await service.addFavorite(movieDto);

			expect(database.favorite.findFirst).toHaveBeenCalledWith({
				where: {
					type: FavoriteType.Movie,
					userId: "user-uuid-1",
					movieId: "movie-uuid-1",
				},
			});

			expect(database.favorite.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: {
						type: FavoriteType.Movie,
						userId: "user-uuid-1",
						movieId: "movie-uuid-1",
					},
				}),
			);
		});

		it("should handle different favorite types (Game)", async () => {
			const gameDto: AddFavoriteDto = {
				type: FavoriteType.Game,
				userId: "user-uuid-1",
				item: { gameId: "game-uuid-1" },
			};

			database.favorite.findFirst.mockResolvedValue(null);
			database.favorite.create.mockResolvedValue({
				id: "fav-uuid-3",
				...gameDto,
			});
			queue.toFeedEventQueue.mockResolvedValue(undefined);

			await service.addFavorite(gameDto);

			expect(database.favorite.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: {
						type: FavoriteType.Game,
						userId: "user-uuid-1",
						gameId: "game-uuid-1",
					},
				}),
			);
		});

		it("should handle different favorite types (Book)", async () => {
			const bookDto: AddFavoriteDto = {
				type: FavoriteType.Book,
				userId: "user-uuid-1",
				item: { bookId: "book-uuid-1" },
			};

			database.favorite.findFirst.mockResolvedValue(null);
			database.favorite.create.mockResolvedValue({
				id: "fav-uuid-4",
				...bookDto,
			});
			queue.toFeedEventQueue.mockResolvedValue(undefined);

			await service.addFavorite(bookDto);

			expect(database.favorite.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: {
						type: FavoriteType.Book,
						userId: "user-uuid-1",
						bookId: "book-uuid-1",
					},
				}),
			);
		});

		it("should omit undefined entity IDs from the query", async () => {
			const dtoWithUndefined: AddFavoriteDto = {
				type: FavoriteType.Manga,
				userId: "user-uuid-1",
				item: { mangaId: "manga-uuid-1" },
			};

			database.favorite.findFirst.mockResolvedValue(null);
			database.favorite.create.mockResolvedValue({ id: "fav-uuid-5" });
			queue.toFeedEventQueue.mockResolvedValue(undefined);

			await service.addFavorite(dtoWithUndefined);

			expect(database.favorite.findFirst).toHaveBeenCalledWith({
				where: {
					type: FavoriteType.Manga,
					userId: "user-uuid-1",
					mangaId: "manga-uuid-1",
				},
			});
		});

		it("should include related entities in the create call", async () => {
			database.favorite.findFirst.mockResolvedValue(null);
			database.favorite.create.mockResolvedValue({ id: "fav-uuid-6" });
			queue.toFeedEventQueue.mockResolvedValue(undefined);

			await service.addFavorite(dto);

			const createCall = database.favorite.create.mock.calls[0][0];
			expect(createCall.include).toBeDefined();
			expect(createCall.include.user).toBeDefined();
			expect(createCall.include.anime).toBeDefined();
			expect(createCall.include.manga).toBeDefined();
			expect(createCall.include.tvShow).toBeDefined();
			expect(createCall.include.movie).toBeDefined();
			expect(createCall.include.game).toBeDefined();
			expect(createCall.include.book).toBeDefined();
		});
	});

	describe("getFavoritesByUserId", () => {
		const dto: GetFavoritesByUserIdDto = {
			userId: "user-uuid-1",
			page: 1,
			itemsPerPage: 10,
		};

		it("should return paginated favorites for a user", async () => {
			database.user.findUnique.mockResolvedValue({ id: "user-uuid-1" });

			const paginatedResult = {
				items: [
					{ id: "fav-1", type: FavoriteType.Anime },
					{ id: "fav-2", type: FavoriteType.Movie },
				],
				meta: { totalItems: 2, totalPages: 1, currentPage: 1 },
			};
			database.offsetPagination.mockResolvedValue(paginatedResult);

			const result = await service.getFavoritesByUserId(dto);

			expect(database.user.findUnique).toHaveBeenCalledWith({
				where: { id: "user-uuid-1" },
			});

			expect(database.offsetPagination).toHaveBeenCalledWith(
				expect.objectContaining({
					model: "favorite",
					itemsPerPage: 10,
					page: 1,
					where: { userId: "user-uuid-1" },
				}),
			);

			expect(result).toEqual(paginatedResult);
		});

		it("should throw USER_NOT_FOUND when user does not exist", async () => {
			database.user.findUnique.mockResolvedValue(null);

			await expect(service.getFavoritesByUserId(dto)).rejects.toThrow(
				AppException,
			);
			await expect(service.getFavoritesByUserId(dto)).rejects.toThrow(
				expect.objectContaining({
					response: { code: ERROR_CODES.USER_NOT_FOUND.message },
				}),
			);

			expect(database.offsetPagination).not.toHaveBeenCalled();
		});

		it("should pass select fields to offsetPagination", async () => {
			database.user.findUnique.mockResolvedValue({ id: "user-uuid-1" });
			database.offsetPagination.mockResolvedValue({ items: [], meta: {} });

			await service.getFavoritesByUserId(dto);

			const paginationCall = database.offsetPagination.mock.calls[0][0];
			expect(paginationCall.select).toBeDefined();
			expect(paginationCall.select.id).toBe(true);
			expect(paginationCall.select.type).toBe(true);
			expect(paginationCall.select.createdAt).toBe(true);
			expect(paginationCall.select.user).toBeDefined();
			expect(paginationCall.select.anime).toBeDefined();
			expect(paginationCall.select.manga).toBeDefined();
			expect(paginationCall.select.tvShow).toBeDefined();
			expect(paginationCall.select.movie).toBeDefined();
			expect(paginationCall.select.game).toBeDefined();
			expect(paginationCall.select.book).toBeDefined();
		});

		it("should handle different page parameters", async () => {
			const dtoPage2: GetFavoritesByUserIdDto = {
				userId: "user-uuid-1",
				page: 2,
				itemsPerPage: 5,
			};

			database.user.findUnique.mockResolvedValue({ id: "user-uuid-1" });
			database.offsetPagination.mockResolvedValue({ items: [], meta: {} });

			await service.getFavoritesByUserId(dtoPage2);

			expect(database.offsetPagination).toHaveBeenCalledWith(
				expect.objectContaining({
					page: 2,
					itemsPerPage: 5,
				}),
			);
		});
	});

	describe("removeFavorite", () => {
		const dto: RemoveFavoriteDto = {
			type: FavoriteType.Anime,
			userId: "user-uuid-1",
			item: { animeId: "anime-uuid-1" },
		};

		it("should remove a favorite successfully", async () => {
			const existingFavorite = { id: "fav-uuid-1", type: FavoriteType.Anime };
			database.favorite.findFirst.mockResolvedValue(existingFavorite);
			database.favorite.delete.mockResolvedValue(existingFavorite);

			await service.removeFavorite(dto);

			expect(database.favorite.findFirst).toHaveBeenCalledWith({
				where: {
					type: FavoriteType.Anime,
					userId: "user-uuid-1",
					animeId: "anime-uuid-1",
				},
			});

			expect(database.favorite.delete).toHaveBeenCalledWith({
				where: { id: "fav-uuid-1" },
			});
		});

		it("should throw FAVORITE_NOT_FOUND when favorite does not exist", async () => {
			database.favorite.findFirst.mockResolvedValue(null);

			await expect(service.removeFavorite(dto)).rejects.toThrow(AppException);
			await expect(service.removeFavorite(dto)).rejects.toThrow(
				expect.objectContaining({
					response: { code: ERROR_CODES.FAVORITE_NOT_FOUND.message },
				}),
			);

			expect(database.favorite.delete).not.toHaveBeenCalled();
		});

		it("should omit undefined entity IDs from the query", async () => {
			const dtoWithUndefined: RemoveFavoriteDto = {
				type: FavoriteType.TVShow,
				userId: "user-uuid-1",
				item: { tvShowId: "tvshow-uuid-1" },
			};

			database.favorite.findFirst.mockResolvedValue({ id: "fav-uuid-2" });
			database.favorite.delete.mockResolvedValue(undefined);

			await service.removeFavorite(dtoWithUndefined);

			expect(database.favorite.findFirst).toHaveBeenCalledWith({
				where: {
					type: FavoriteType.TVShow,
					userId: "user-uuid-1",
					tvShowId: "tvshow-uuid-1",
				},
			});
		});

		it("should handle Movie type removal", async () => {
			const movieDto: RemoveFavoriteDto = {
				type: FavoriteType.Movie,
				userId: "user-uuid-1",
				item: { movieId: "movie-uuid-1" },
			};

			database.favorite.findFirst.mockResolvedValue({ id: "fav-uuid-3" });
			database.favorite.delete.mockResolvedValue(undefined);

			await service.removeFavorite(movieDto);

			expect(database.favorite.delete).toHaveBeenCalledWith({
				where: { id: "fav-uuid-3" },
			});
		});
	});
});
