import { Test, TestingModule } from '@nestjs/testing';
import { FavoriteType } from '@prisma/generated/enums';

import { FavoriteController } from './favorite.controller';
import { FavoriteService } from './favorite.service';
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';

jest.mock('@thallesp/nestjs-better-auth', () => ({
	Session: () => () => {},
}));

jest.mock('@/shared/decorators/ratelimit.decorator', () => ({
	RateLimit: () => () => {},
	RATE_LIMIT_KEY: 'rateLimit',
}));

jest.mock('@/shared/guards/ratelimit.guard', () => ({
	RateLimitGuard: class {
		canActivate() { return true; }
	},
}));

jest.mock('@prisma/generated/client', () => ({}));

jest.mock('@/shared/infra/database/database.service', () => ({
  DatabaseService: jest.fn(),
}));

jest.mock('@/shared/infra/queue/queue.service', () => ({
  QueueService: jest.fn(),
}));

const mockFavoriteService = {
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
  getFavoritesByUserId: jest.fn(),
};

const mockSession = {
  user: { id: 'user-uuid-1' },
  session: { id: 'session-uuid-1' },
};

describe('FavoriteController', () => {
  let controller: FavoriteController;
  let service: typeof mockFavoriteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoriteController],
      providers: [
        { provide: FavoriteService, useValue: mockFavoriteService },
      ],
    })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FavoriteController>(FavoriteController);
    service = module.get(FavoriteService);

    jest.clearAllMocks();
  });

  describe('addFavorite', () => {
    it('should call favoriteService.addFavorite with body and session userId', async () => {
      const body = {
        type: FavoriteType.Anime as FavoriteType,
        animeId: 'anime-uuid-1',
      };

      service.addFavorite.mockResolvedValue(undefined);

      await controller.addFavorite(mockSession as any, body as any);

      expect(service.addFavorite).toHaveBeenCalledWith({
        type: FavoriteType.Anime,
        animeId: 'anime-uuid-1',
        userId: 'user-uuid-1',
      });
    });

    it('should call favoriteService.addFavorite with Movie type', async () => {
      const body = {
        type: FavoriteType.Movie as FavoriteType,
        movieId: 'movie-uuid-1',
      };

      service.addFavorite.mockResolvedValue(undefined);

      await controller.addFavorite(mockSession as any, body as any);

      expect(service.addFavorite).toHaveBeenCalledWith({
        type: FavoriteType.Movie,
        movieId: 'movie-uuid-1',
        userId: 'user-uuid-1',
      });
    });

    it('should propagate errors from the service', async () => {
      const body = {
        type: FavoriteType.Anime as FavoriteType,
        animeId: 'anime-uuid-1',
      };

      service.addFavorite.mockRejectedValue(new Error('Service error'));

      await expect(
        controller.addFavorite(mockSession as any, body as any),
      ).rejects.toThrow('Service error');
    });
  });

  describe('removeFavorite', () => {
    it('should call favoriteService.removeFavorite with body and session userId', async () => {
      const body = {
        type: FavoriteType.Anime as FavoriteType,
        animeId: 'anime-uuid-1',
      };

      service.removeFavorite.mockResolvedValue(undefined);

      await controller.removeFavorite(mockSession as any, body as any);

      expect(service.removeFavorite).toHaveBeenCalledWith({
        type: FavoriteType.Anime,
        animeId: 'anime-uuid-1',
        userId: 'user-uuid-1',
      });
    });

    it('should call favoriteService.removeFavorite with Game type', async () => {
      const body = {
        type: FavoriteType.Game as FavoriteType,
        gameId: 'game-uuid-1',
      };

      service.removeFavorite.mockResolvedValue(undefined);

      await controller.removeFavorite(mockSession as any, body as any);

      expect(service.removeFavorite).toHaveBeenCalledWith({
        type: FavoriteType.Game,
        gameId: 'game-uuid-1',
        userId: 'user-uuid-1',
      });
    });

    it('should propagate errors from the service', async () => {
      const body = {
        type: FavoriteType.Anime as FavoriteType,
        animeId: 'anime-uuid-1',
      };

      service.removeFavorite.mockRejectedValue(new Error('Not found'));

      await expect(
        controller.removeFavorite(mockSession as any, body as any),
      ).rejects.toThrow('Not found');
    });
  });

  describe('getFavoritesByUserId', () => {
    it('should return favorites wrapped in an object', async () => {
      const paginatedResult = {
        items: [
          { id: 'fav-1', type: FavoriteType.Anime },
          { id: 'fav-2', type: FavoriteType.Movie },
        ],
        meta: { totalItems: 2, totalPages: 1, currentPage: 1 },
      };

      service.getFavoritesByUserId.mockResolvedValue(paginatedResult);

      const result = await controller.getFavoritesByUserId('user-uuid-1', {
        page: 1,
        itemsPerPage: 10,
      } as any);

      expect(service.getFavoritesByUserId).toHaveBeenCalledWith({
        userId: 'user-uuid-1',
        page: 1,
        itemsPerPage: 10,
      });

      expect(result).toEqual({ favorites: paginatedResult });
    });

    it('should pass different pagination params', async () => {
      service.getFavoritesByUserId.mockResolvedValue({ items: [], meta: {} });

      await controller.getFavoritesByUserId('user-uuid-2', {
        page: 3,
        itemsPerPage: 5,
      } as any);

      expect(service.getFavoritesByUserId).toHaveBeenCalledWith({
        userId: 'user-uuid-2',
        page: 3,
        itemsPerPage: 5,
      });
    });

    it('should propagate errors from the service', async () => {
      service.getFavoritesByUserId.mockRejectedValue(new Error('User not found'));

      await expect(
        controller.getFavoritesByUserId('invalid-id', { page: 1, itemsPerPage: 10 } as any),
      ).rejects.toThrow('User not found');
    });
  });
});
