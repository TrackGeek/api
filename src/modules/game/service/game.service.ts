import { Injectable } from "@nestjs/common";
import { ProgressStatus } from "@prisma/generated/client";
import { GameCreateInput, GameUpdateInput } from "@prisma/generated/models";
import { TopGameDto } from "@/modules/game/dto/top-game.dto";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IGDBGameOrderBy, IGDBSort } from "@/shared/infra/integrations/igdb.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import type { RefreshGameDto } from "../dto/refresh-game.dto";
import type { SearchGameDto } from "../dto/search-game.dto";

@Injectable()
export class GameService {
  constructor(
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
    };
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

  async getGameFranchise(slug: string) {
    const franchise = await this.integrationsService.igdb.getFranchiseBySlug(slug);

    const trackedGames = await this.databaseService.game.findMany({
      where: { igdbId: { in: franchise.games.map((game) => game.igdbId) } },
      select: { igdbId: true, lastRefreshedAt: true, gameReviews: { select: { overall: true } } },
    });

    const games = franchise.games.map((game) => {
      const tracked = trackedGames.find((trackedGame) => trackedGame.igdbId === game.igdbId);
      const reviews = tracked?.gameReviews ?? [];
      const tgReviewScore = reviews.length
        ? parseFloat((reviews.reduce((sum, review) => sum + Number(review.overall), 0) / reviews.length).toFixed(1))
        : 0;

      return {
        ...game,
        tgReviewScore,
        lastRefreshedAt: tracked?.lastRefreshedAt ?? null,
      };
    });

    return { ...franchise, games };
  }

  async getGameByIgdbId(igdbId: number) {
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
      playing: getStats(ProgressStatus.Playing),
      completed: getStats(ProgressStatus.Completed),
      planToPlay: getStats(ProgressStatus.Planning),
      dropped: getStats(ProgressStatus.Dropped),
    };

    const gameWithStats = {
      ...game,
      tgReviewScore,
      progressStats,
    };

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

    const igdbGame = await this.integrationsService.igdb.getGameById(refreshGameDto.igdbId);

    await this.databaseService.game.update({
      where: { igdbId: refreshGameDto.igdbId },
      data: igdbGame as unknown as GameUpdateInput,
    });

    await this.getGameByIgdbId(refreshGameDto.igdbId);
  }

  async resetGameTracking({ userId, gameId }: { userId: string; gameId: string }) {
    await this.databaseService.$transaction([
      this.databaseService.gameReview.deleteMany({ where: { userId, gameId } }),
      this.databaseService.gameProgress.deleteMany({ where: { userId, gameId } }),
      this.databaseService.gameScreenshot.deleteMany({ where: { userId, gameId } }),
    ]);
  }
}
