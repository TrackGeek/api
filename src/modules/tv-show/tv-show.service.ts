import { Injectable } from "@nestjs/common";

import type { SearchTVShowDto } from "./dtos/search-tv-show.dto";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import { CacheKeys, CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { TvShow } from "@prisma/generated/client";
import { RefreshTVShowDto } from "./dtos/refresh-tv-show.dto";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { REFRESH_INTERVAL_MS } from "@/shared/constants/refresh-interval";

@Injectable()
export class TVShowService {
	constructor(
		private readonly cacheService: CacheService,
		private readonly databaseService: DatabaseService,
		private readonly integrationsService: IntegrationsService,
	) {}

	private get cacheKeys(): CacheKeys {
		return {
			tvShowById: {
				prefix: (id: number) => `tvShow:id:${id}`,
				expiration: 3600 * 6, // 6 hours
			},
		};
	}

	async searchTVShows(searchTVShowDto: SearchTVShowDto) {
		return this.integrationsService.tmdb.searchTVShows(searchTVShowDto.query);
	}

	async getTVShowById(id: number) {
		const cachedTVShow = await this.cacheService.get<TvShow>(
			this.cacheKeys.tvShowById.prefix(id),
		);

		if (cachedTVShow) {
			return cachedTVShow;
		}

		let tvShow = await this.databaseService.tvShow.findUnique({
			where: { tmdbId: id },
		});

		if (!tvShow) {
			const tmdbTVShow = await this.integrationsService.tmdb.getTVShowById(id);

			tvShow = await this.databaseService.tvShow.create({
				data: tmdbTVShow,
			});
		}

		await this.cacheService.set(
			this.cacheKeys.tvShowById.prefix(id),
			tvShow,
			this.cacheKeys.tvShowById.expiration,
		);

		return tvShow;
	}

	async refreshTVShow(refreshTVShowDto: RefreshTVShowDto) {
		const tvShow = await this.databaseService.tvShow.findUnique({
			where: { tmdbId: refreshTVShowDto.id },
		});

		if (!tvShow) {
			throw new AppException(ERROR_CODES.TVSHOW_NOT_FOUND);
		}

		if (Date.now() - tvShow.lastRefreshedAt.getTime() < REFRESH_INTERVAL_MS) {
			throw new AppException(ERROR_CODES.TVSHOW_ALREADY_REFRESHED);
		}

		if (
			await this.cacheService.exists(
				this.cacheKeys.tvShowById.prefix(tvShow.tmdbId),
			)
		) {
			await this.cacheService.delete(
				this.cacheKeys.tvShowById.prefix(tvShow.tmdbId),
			);
		}

		const tmdbTVShow = await this.integrationsService.tmdb.getTVShowById(
			tvShow.tmdbId,
		);

		await this.databaseService.tvShow.update({
			where: { tmdbId: refreshTVShowDto.id },
			data: tmdbTVShow,
		});

		await this.cacheService.set(
			this.cacheKeys.tvShowById.prefix(tvShow.tmdbId),
			tvShow,
			this.cacheKeys.tvShowById.expiration,
		);
	}
}
