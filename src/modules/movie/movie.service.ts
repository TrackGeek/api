import { Injectable } from "@nestjs/common";
import { Movie } from '@prisma/generated/client';
import type { SearchMovieDto } from "./dtos/search-movie.dto";
import { IntegrationsService } from "@/shared/infra/integrations/integrations.service";
import { CacheKeys, CacheService } from '@/shared/infra/cache/cache.service';
import { DatabaseService } from '@/shared/infra/database/database.service';
import { AppException } from '@/shared/exceptions/app.exceptions';
import { ERROR_CODES } from '@/shared/constants/error-codes';
import { RefreshMovieDto } from './dtos/refresh-movie.dto';
import { REFRESH_INTERVAL_MS } from '@/shared/constants/refresh-interval';

@Injectable()
export class MovieService {
	constructor(
		private readonly cacheService: CacheService,
		private readonly databaseService: DatabaseService,
		private readonly integrationsService: IntegrationsService,
	) {}
	
	private get cacheKeys(): CacheKeys {
		return {
			movieById: {
				prefix: (id: number) => `movie:id:${id}`,
				expiration: 3600 * 6, // 6 hours
			},
		};
	}

	async searchMovies(searchMovieDto: SearchMovieDto) {
		return this.integrationsService.tmdb.searchMovies(searchMovieDto.query);
	}
	
	async getMovieById(id: number) {
		const cachedMovie = await this.cacheService.get<Movie>(
			this.cacheKeys.movieById.prefix(id),
		);

		if (cachedMovie) {
			return cachedMovie;
		}

		let movie = await this.databaseService.movie.findUnique({
			where: { tmdbId: id },
		});

		if (!movie) {
			const tmdbMovie = await this.integrationsService.tmdb.getMovieById(id);

			movie = await this.databaseService.movie.create({
				data: tmdbMovie,
			});
		}

		await this.cacheService.set(
			this.cacheKeys.movieById.prefix(id),
			movie,
			this.cacheKeys.movieById.expiration,
		);

		return movie;
	}

	async refreshMovie(refreshMovieDto: RefreshMovieDto) {
		const movie = await this.databaseService.movie.findUnique({
			where: { tmdbId: refreshMovieDto.id },
		});

		if (!movie) {
			throw new AppException(ERROR_CODES.GAME_NOT_FOUND);
		}

		if (Date.now() - movie.lastRefreshedAt.getTime() < REFRESH_INTERVAL_MS) {
			throw new AppException(ERROR_CODES.GAME_ALREADY_REFRESHED);
		}

		if (
			await this.cacheService.exists(this.cacheKeys.movieById.prefix(movie.tmdbId))
		) {
			await this.cacheService.delete(this.cacheKeys.movieById.prefix(movie.tmdbId));
		}

		const tmdbMovie = await this.integrationsService.tmdb.getMovieById(
			movie.tmdbId,
		);

		await this.databaseService.movie.update({
			where: { tmdbId: refreshMovieDto.id },
			data: tmdbMovie,
		});

		await this.cacheService.set(
			this.cacheKeys.movieById.prefix(movie.tmdbId),
			movie,
			this.cacheKeys.movieById.expiration,
		);
	}
}
