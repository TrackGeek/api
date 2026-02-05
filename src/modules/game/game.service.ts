import { Injectable } from "@nestjs/common";
import { Game } from '@prisma/generated/client';

import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { type CacheKeys, CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import type { RefreshGameDto } from "./dtos/refresh-game.dto";
import type { SearchGameDto } from "./dtos/search-game.dto";
import { IntegrationsService } from '@/shared/infra/integrations/integrations.service';
	
const REFRESH_INTERVAL_MS = 3600 * 24 * 1000; // 24 hours

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
				prefix: (id: string) => `game:id:${id}`,
				expiration: 3600 * 6,
			},
			gameBySlug: {
				prefix: (slug: string) => `game:slug:${slug}`,
				expiration: 3600 * 6,
			}
		}
	}

	async searchGames(searchGameDto: SearchGameDto) {
		return this.integrationsService.igdb.searchGames(searchGameDto.query);
	}

	async getGameById(id: string) {
		const cachedGame = await this.cacheService.get<any>(this.cacheKeys.gameById.prefix(id));

		if (cachedGame) {
			return cachedGame;
		}

		const game = await this.databaseService.game.findUnique({
			where: { id },
		});

		if (!game) {
			throw new AppException(ERROR_CODES.GAME_NOT_FOUND);
		}

		await this.cacheService.set(
			this.cacheKeys.gameById.prefix(id),
			game,
			this.cacheKeys.gameById.expiration
		);

		return game;
	}

	async getGameBySlug(slug: string) {
		const cachedGame = await this.cacheService.get<Game>(this.cacheKeys.gameBySlug.prefix(slug));

		if (cachedGame) {
			return cachedGame;
		}

		let game = await this.databaseService.game.findUnique({
			where: { slug },
		});

		if (!game) {
			const igdbGame = await this.integrationsService.igdb.getGameBySlug(slug);

			game = await this.databaseService.game.create({
				data: igdbGame,
			});
		}

		await this.cacheService.set(
			this.cacheKeys.gameBySlug.prefix(slug),
			game,
			this.cacheKeys.gameBySlug.expiration
		);

		return game;
	}

	async refreshGame(refreshGameDto: RefreshGameDto) {
		const game = await this.databaseService.game.findUnique({
			where: { id: refreshGameDto.id },
		});

		if (!game) {
			throw new AppException(ERROR_CODES.GAME_NOT_FOUND);
		}

		if (Date.now() - game.lastRefreshedAt.getTime() < REFRESH_INTERVAL_MS) {
			throw new AppException(ERROR_CODES.GAME_ALREADY_REFRESHED);
		}

		if (await this.cacheService.exists(this.cacheKeys.gameBySlug.prefix(game.slug))) {
			await this.cacheService.delete(this.cacheKeys.gameBySlug.prefix(game.slug));
		}

		const igdbGame = await this.integrationsService.igdb.getGameBySlug(game.slug);

		await this.databaseService.game.update({
			where: { id: refreshGameDto.id },
			data: igdbGame,
		});

		await this.cacheService.set(
			this.cacheKeys.gameBySlug.prefix(game.slug),
			game,
			this.cacheKeys.gameBySlug.expiration
		);
	}
}
