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
				expiration: 3600 * 12, // 12 hours
			},
			searchTVShows: {
				prefix: (query: string) => `tmdb:search:tv:${query}`,
				expiration: 3600 * 12, // 12 hours
			},
			getMovieById: {
				prefix: (id: number) => `tmdb:movie:id:${id}`,
				expiration: 3600 * 24, // 24 hours
			},
			getTVShowById: {
				prefix: (id: number) => `tmdb:tv:id:${id}`,
				expiration: 3600 * 24, // 24 hours
			},
		};
	}

	async searchMovies(query: string): Promise<any> {
		try {
			const cachedMovies = await this.cacheService.get(
				this.cacheKeys.searchMovies.prefix(query),
			);

			if (cachedMovies) {
				return cachedMovies;
			}

			const movieResponse = await firstValueFrom(
				this.httpService.get(`${this.TMDB_API_URL}/search/movie`, {
					params: { query },
					headers: {
						Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
					},
				}),
			);
			
			const moviesData = movieResponse.data;

			const movies = moviesData.results.map((movie: any) => ({
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

	async searchTVShows(query: string): Promise<any> {
		try {
			const cachedTVShows = await this.cacheService.get(
				this.cacheKeys.searchTVShows.prefix(query),
			);

			if (cachedTVShows) {
				return cachedTVShows;
			}

			const tvShowsResponse = await firstValueFrom(
				this.httpService.get(`${this.TMDB_API_URL}/search/tv`, {
					params: { query },
					headers: {
						Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
					},
				}),
			);
			
			const tvShowsData = tvShowsResponse.data;

			const tvShows = tvShowsData.results.map((show: any) => ({
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

	async getMovieById(id: number): Promise<any> {
		try {
			const cachedMovie = await this.cacheService.get(
				this.cacheKeys.getMovieById.prefix(id),
			);

			if (cachedMovie) {
				return cachedMovie;
			}
			
			const movieResponse = await firstValueFrom(
				this.httpService.get(`${this.TMDB_API_URL}/movie/${id}`, {
					headers: {
						Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
					},
				}),
			);
			
			const creditsResponse = await firstValueFrom(
				this.httpService.get(`${this.TMDB_API_URL}/movie/${id}/credits`, {
					headers: {
						Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
					},
				}),
			);
			
			const movieData = movieResponse.data;
			const creditsData = creditsResponse.data;
			
			const videosResponse = movieData?.video ? await firstValueFrom(
				this.httpService.get(`${this.TMDB_API_URL}/movie/${id}/videos`, {
					headers: {
						Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
					},
				}),
			) : null;
			
			const videosData = videosResponse ? videosResponse.data.results : [];

			const movie = {
				tmdbId: movieData.id,
				imdbId: movieData.imdb_id,
				belongsToCollection: movieData.belongs_to_collection ? {
					name: movieData.belongs_to_collection.name,
					posterUrl: movieData.belongs_to_collection.poster_path
						? `https://image.tmdb.org/t/p/w500${movieData.belongs_to_collection.poster_path}`
						: null,
					backdropUrl: movieData.belongs_to_collection.backdrop_path
						? `https://image.tmdb.org/t/p/w500${movieData.belongs_to_collection.backdrop_path}`
						: null,
				} : {},
				budget: movieData.budget,
				genres: movieData.genres.map((genre: any) => genre.name),
				homepage: movieData.homepage,
				originalLanguage: movieData.original_language,
				originalTitle: movieData.original_title,
				overview: movieData.overview,
				popularity: movieData.popularity,
				posterUrl: movieData.poster_path
					? `https://image.tmdb.org/t/p/w500${movieData.poster_path}`
					: null,
				productionCompanies: movieData.production_companies.map((company: any) => ({
					logoUrl: company.logo_path ? `https://image.tmdb.org/t/p/w500${company.logo_path}` : null,
					name: company.name,
					originCountry: company.origin_country,
				})),
				productionCountries: movieData.production_countries.map((country: any) => country.name),
				releaseDate: movieData.release_date ? new Date(movieData.release_date) : null,
				revenue: movieData.revenue,
				runtime: movieData.runtime,
				spokenLanguages: movieData.spoken_languages.map((lang: any) => ({
					englishName: lang.english_name,
					name: lang.name,
					iso639_1: lang.iso_639_1,
				})),
				status: movieData.status,
				title: movieData.title,
				cast: creditsData.cast.map((castMember: any) => ({
					id: castMember.id,
					name: castMember.name,
					character: castMember.character,
					profileUrl: castMember.profile_path
						? `https://image.tmdb.org/t/p/w500${castMember.profile_path}`
						: null,
				})),
				crew: creditsData.crew.map((crewMember: any) => ({
					id: crewMember.id,
					name: crewMember.name,
					job: crewMember.job,
					profileUrl: crewMember.profile_path
						? `https://image.tmdb.org/t/p/w500${crewMember.profile_path}`
						: null,
				})),
				videos: videosData?.map((video: any) => ({
					id: video.id,
					key: video.key,
					name: video.name,
					site: video.site,
					type: video.type,
					publishedAt: video.published_at ? new Date(video.published_at) : null,
				})),
			};
			
			await this.cacheService.set(
				this.cacheKeys.getMovieById.prefix(id),
				movie,
				this.cacheKeys.getMovieById.expiration,
			);

			return movie;
		} catch (error) {
			throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
		}
	}
	
	async getTVShowById(id: number) {
		try {
			const cachedTVShow = await this.cacheService.get(
				this.cacheKeys.getTVShowById.prefix(id),
			);

			if (cachedTVShow) {
				return cachedTVShow;
			}
			
			const tvShowResponse = await firstValueFrom(
				this.httpService.get(`${this.TMDB_API_URL}/tv/${id}`, {
					headers: {
						Authorization: `Bearer ${this.configService.get("TMDB_API_KEY")}`,
					},
				}),
			);

			const tvShowData = tvShowResponse.data;

			const tvShow = {
				tmdbId: tvShowData.id,
				name: tvShowData.name,
				firstAirDate: tvShowData.first_air_date ? new Date(tvShowData.first_air_date) : null,
				posterUrl: tvShowData.poster_path
					? `https://image.tmdb.org/t/p/w500${tvShowData.poster_path}`
					: null,
				overview: tvShowData.overview,
			};
			
			await this.cacheService.set(
				this.cacheKeys.getTVShowById.prefix(id),
				tvShow,
				this.cacheKeys.getTVShowById.expiration,
			);

			return tvShow;
		} catch (error) {
			throw new AppException(ERROR_CODES.TMDB_SERVICE_UNAVAILABLE);
		}
	}
}
