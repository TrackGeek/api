import { Injectable } from "@nestjs/common";
import { Game, ProgressStatus } from "@prisma/generated/client";
import { GameCreateInput, GameUpdateInput } from "@prisma/generated/models";
import { TopGameDto } from "@/modules/game/dto/top-game.dto";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import type { RefreshGameDto } from "../dto/refresh-game.dto";
import type { SearchGameDto } from "../dto/search-game.dto";
import { IGDBGameOrderBy, IGDBSort } from '@/shared/infra/integrations/igdb.service';

@Injectable()
export class GameService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async searchGames(searchGameDto: SearchGameDto) {
    const igdbPagination = await this.integrationsService.igdb.searchGames(searchGameDto);
    
    const items = await Promise.all(
      igdbPagination.items.map(async (item) => {
        const tgReviewScore = await this.databaseService.gameReview
          .aggregate({ where: { game: { igdbId: item.igdbId } }, _avg: { overall: true } })
          .then((result) => (result._avg.overall ? parseFloat(result._avg.overall.toFixed(1)) : 0))
          .catch(() => 0);

        const game = await this.databaseService.game.findUnique({
          where: { igdbId: item.igdbId },
          select: { lastRefreshedAt: true },
        });

        return {
          ...item,
          tgReviewScore,
          lastRefreshedAt: game?.lastRefreshedAt ?? null,
        };
      }),
    );
    
    return {
      ...igdbPagination,
      items,
    }
  }

  async topGames(topGameDto: TopGameDto) {
     const igdbPagination = await this.integrationsService.igdb.topGames(topGameDto);

    const items = await Promise.all(
      igdbPagination.items.map(async (item) => {
        const tgReviewScore = await this.databaseService.gameReview
          .aggregate({ where: { game: { igdbId: item.igdbId } }, _avg: { overall: true } })
          .then((result) => (result._avg.overall ? parseFloat(result._avg.overall.toFixed(1)) : 0))
          .catch(() => 0);

        const game = await this.databaseService.game.findUnique({
          where: { igdbId: item.igdbId },
          select: { lastRefreshedAt: true },
        });

        return {
          ...item,
          tgReviewScore,
          lastRefreshedAt: game?.lastRefreshedAt ?? null,
        };
      }),
    );

    return {
      ...igdbPagination,
      items,
    };
  }
  
  async gameFilters() {
    const orderBy = Object.values(IGDBGameOrderBy);
    const sort = Object.values(IGDBSort);
    const status = await this.integrationsService.igdb.getGameStatus();
    const genres = await this.integrationsService.igdb.getGameGenres();
    const modes = await this.integrationsService.igdb.getGameModes();
    const platforms = await this.integrationsService.igdb.getGamePlatforms();

    return {
      status,
      genres,
      platforms,
      modes,
      orderBy,
      sort,
    };
  }

  async getGameByIgdbId(igdbId: number) {
    const cachedGame = await this.cacheService.get<Game>(CACHE_KEYS.GAME_BY_IGDB_ID.prefix(igdbId));

    if (cachedGame) {
      return cachedGame;
    }

    let game = await this.databaseService.game.findUnique({
      where: { igdbId },
    });

    if (!game) {
      const igdbGame = await this.integrationsService.igdb.getGameById(igdbId);

      game = await this.databaseService.game.create({
        data: igdbGame as unknown as GameCreateInput,
      });
    }

    const tgReviewScore = await this.databaseService.gameReview
      .aggregate({ where: { game: { igdbId } }, _avg: { overall: true } })
      .then((result) => (result._avg.overall ? parseFloat(result._avg.overall.toFixed(1)) : 0))
      .catch(() => 0);

    const progressGroups = await this.databaseService.gameProgress.groupBy({
      by: ["status"],
      where: { game: { igdbId } },
      _count: { status: true },
    });

    const totalProgress = progressGroups.reduce((sum, g) => sum + g._count.status, 0);

    const getStats = (status: ProgressStatus) => {
      const count = progressGroups.find((g) => g.status === status)?._count.status ?? 0;
      return {
        count,
        percentage: totalProgress > 0 ? parseFloat(((count / totalProgress) * 100).toFixed(1)) : 0,
      };
    };

    const progressStats = {
      watching: getStats(ProgressStatus.Watching),
      completed: getStats(ProgressStatus.Completed),
      planToWatch: getStats(ProgressStatus.Planning),
      dropped: getStats(ProgressStatus.Dropped),
    };

    const gameWithStats = {
      ...game,
      tgReviewScore,
      progressStats,
    };

    await this.cacheService.set(
      CACHE_KEYS.GAME_BY_IGDB_ID.prefix(igdbId),
      gameWithStats,
      CACHE_KEYS.GAME_BY_IGDB_ID.expiration,
    );

    return gameWithStats;
  }

  async refreshGame(refreshGameDto: RefreshGameDto) {
    const game = await this.databaseService.game.findUnique({
      where: { igdbId: refreshGameDto.igdbId },
      select: {
        lastRefreshedAt: true,
      },
    });

    if (!game) {
      throw new AppException(ERROR_CODES.GAME_NOT_FOUND);
    }

    if (Date.now() - game.lastRefreshedAt.getTime() < REFRESH_INTERVAL_MS) {
      throw new AppException(ERROR_CODES.GAME_ALREADY_REFRESHED);
    }

    if (await this.cacheService.exists(CACHE_KEYS.GAME_BY_IGDB_ID.prefix(refreshGameDto.igdbId))) {
      await this.cacheService.delete(CACHE_KEYS.GAME_BY_IGDB_ID.prefix(refreshGameDto.igdbId));
    }

    const igdbGame = await this.integrationsService.igdb.getGameById(refreshGameDto.igdbId);

    await this.databaseService.game.update({
      where: { igdbId: refreshGameDto.igdbId },
      data: igdbGame as unknown as GameUpdateInput,
    });

    await this.cacheService.set(
      CACHE_KEYS.GAME_BY_IGDB_ID.prefix(refreshGameDto.igdbId),
      game,
      CACHE_KEYS.GAME_BY_IGDB_ID.expiration,
    );
  }
}
