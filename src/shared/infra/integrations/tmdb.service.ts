import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CacheKeys, CacheService } from "../cache/cache.service";
import { firstValueFrom } from "rxjs";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";

@Injectable()
export class TMDBService {
	private readonly TMDB_API_URL = "https://api.themoviedb.org/3";

	constructor(
		private readonly httpService: HttpService,
		private readonly configService: ConfigService,
		private readonly cacheService: CacheService,
	) {}

	private get cacheKeys(): CacheKeys {
		return {
			searchMovies: {
				prefix: (query: string) => `tmdb:search:movies:${query}`,
				expiration: 3600 * 6, // 6 hours
			},
			searchTVShows: {
				prefix: (query: string) => `tmdb:search:tv:${query}`,
				expiration: 3600 * 6, // 6 hours
			},
		};
	}

	async searchMovies(query: string): Promise<any[]> {
		try {
			const cachedMovies = await this.cacheService.get<any[]>(
				this.cacheKeys.searchMovies.prefix(query),
			);

			if (cachedMovies) {
				return cachedMovies;
			}

			const response = await firstValueFrom(
				this.httpService.get(`${this.TMDB_API_URL}/search/movie`, {
					params: { query },
					headers: {
						Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
					},
				}),
			);

			const movies = response.data.results.map((movie: any) => ({
				tmdbId: movie.id,
				name: movie.title,
				releaseDate: movie.release_date ? new Date(movie.release_date) : null,
				posterUrl: movie.poster_path
					? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
					: null,
			}));

			await this.cacheService.set(
				this.cacheKeys.searchMovies.prefix(query),
				movies,
				this.cacheKeys.searchMovies.expiration,
			);

			return movies;
		} catch (error) {
			throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
		}
	}

	async searchTVShows(query: string): Promise<any[]> {
		try {
			const cachedTVShows = await this.cacheService.get<any[]>(
				this.cacheKeys.searchTVShows.prefix(query),
			);

			if (cachedTVShows) {
				return cachedTVShows;
			}

			const response = await firstValueFrom(
				this.httpService.get(`${this.TMDB_API_URL}/search/tv`, {
					params: { query },
					headers: {
						Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
					},
				}),
			);

			const tvShows = response.data.results.map((show: any) => ({
				tmdbId: show.id,
				name: show.name,
				firstAirDate: show.first_air_date
					? new Date(show.first_air_date)
					: null,
				posterUrl: show.poster_path
					? `https://image.tmdb.org/t/p/w500${show.poster_path}`
					: null,
			}));

			await this.cacheService.set(
				this.cacheKeys.searchTVShows.prefix(query),
				tvShows,
				this.cacheKeys.searchTVShows.expiration,
			);

			return tvShows;
		} catch (error) {
			throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
		}
	}
}
