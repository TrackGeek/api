import { Injectable } from "@nestjs/common";
import { Game } from "@prisma/generated/client";

import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { type CacheKeys, CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import type { RefreshGameDto } from "./dtos/refresh-game.dto";
import type { SearchGameDto } from "./dtos/search-game.dto";

@Injectable()
export class GameService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  private get cacheKeys(): CacheKeys {
    return {
      gameById: {
        prefix: (id: number) => `game:id:${id}`,
        expiration: 3600 * 24, // 24 hours
      },
    };
  }

  async searchGames(searchGameDto: SearchGameDto) {
    return this.integrationsService.igdb.searchGames(searchGameDto.query);
  }

  async getGameById(id: number) {
    const cachedGame = await this.cacheService.get<Game>(this.cacheKeys.gameById.prefix(id));

    if (cachedGame) {
      return cachedGame;
    }

    let game = await this.databaseService.game.findUnique({
      where: { igdbId: id },
    });

    if (!game) {
      const igdbGame = await this.integrationsService.igdb.getGameById(id);

      game = await this.databaseService.game.create({
        data: igdbGame,
      });
    }

    await this.cacheService.set(this.cacheKeys.gameById.prefix(id), game, this.cacheKeys.gameById.expiration);

    return game;
  }

  async refreshGame(refreshGameDto: RefreshGameDto) {
    const game = await this.databaseService.game.findUnique({
      where: { igdbId: refreshGameDto.id },
    });

    if (!game) {
      throw new AppException(ERROR_CODES.GAME_NOT_FOUND);
    }

    if (Date.now() - game.lastRefreshedAt.getTime() < REFRESH_INTERVAL_MS) {
      throw new AppException(ERROR_CODES.GAME_ALREADY_REFRESHED);
    }

    if (await this.cacheService.exists(this.cacheKeys.gameById.prefix(game.igdbId))) {
      await this.cacheService.delete(this.cacheKeys.gameById.prefix(game.igdbId));
    }

    const igdbGame = await this.integrationsService.igdb.getGameById(game.igdbId);

    await this.databaseService.game.update({
      where: { igdbId: refreshGameDto.id },
      data: igdbGame,
    });

    await this.cacheService.set(this.cacheKeys.gameById.prefix(game.igdbId), game, this.cacheKeys.gameById.expiration);
  }
}
