import { Injectable } from "@nestjs/common";
import { Game } from "@prisma/generated/client";

import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import type { RefreshGameDto } from "../dto/refresh-game.dto";
import type { SearchGameDto } from "../dto/search-game.dto";
import { CACHE_KEYS } from "@/shared/constants/cache";

@Injectable()
export class GameService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly databaseService: DatabaseService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  async searchGames(searchGameDto: SearchGameDto) {
    return this.integrationsService.igdb.searchGames(searchGameDto.query);
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
        data: igdbGame,
      });
    }

    await this.cacheService.set(CACHE_KEYS.GAME_BY_IGDB_ID.prefix(igdbId), game, CACHE_KEYS.GAME_BY_IGDB_ID.expiration);

    return game;
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
      data: igdbGame,
    });

    await this.cacheService.set(
      CACHE_KEYS.GAME_BY_IGDB_ID.prefix(refreshGameDto.igdbId),
      game,
      CACHE_KEYS.GAME_BY_IGDB_ID.expiration,
    );
  }
}
