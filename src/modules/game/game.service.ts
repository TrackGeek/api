import type { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import type { CacheService } from "@/shared/infra/cache/cache.service";
import type { PrismaService } from "@/shared/infra/prisma/prisma.service";
import type { RefreshGameDto } from "./dtos/refresh-game.dto";
import type { SearchGameDto } from "./dtos/search-game.dto";

interface IGDBTokenResponse {
	access_token: string;
	expires_in: number;
	token_type: string;
}

@Injectable()
export class GameService {
	private readonly logger = new Logger(GameService.name);

	private readonly IGDB_API_URL = "https://api.igdb.com/v4";

	constructor(
		private readonly httpService: HttpService,
		private readonly configService: ConfigService,
		private readonly cacheService: CacheService,
		private readonly prismaService: PrismaService,
	) {}

	private async getIGDBAccessToken(): Promise<string> {
		const cachedToken = await this.cacheService.get<string>("igdb:token");

		if (cachedToken) {
			return cachedToken;
		}

		const clientId = this.configService.get<string>("IGDB_CLIENT_ID");
		const clientSecret = this.configService.get<string>("IGDB_CLIENT_SECRET");

		try {
			const response = await firstValueFrom(
				this.httpService.post<IGDBTokenResponse>(
					"https://id.twitch.tv/oauth2/token",
					null,
					{
						params: {
							client_id: clientId,
							client_secret: clientSecret,
							grant_type: "client_credentials",
						},
					},
				),
			);

			const { access_token, expires_in } = response.data;

			await this.cacheService.set("igdb:token", access_token, expires_in - 300);

			return access_token;
		} catch (error) {
			this.logger.error("Failed to obtain IGDB access token", error);

			throw new AppException(ERROR_CODES.GAME_SERVICE_UNAVAILABLE);
		}
	}

	async searchGames(searchGameDto: SearchGameDto) {
		const accessToken = await this.getIGDBAccessToken();

		try {
			const cachedGames = await this.cacheService.get<any[]>(
				`igdb:search:${searchGameDto.query}`,
			);

			if (cachedGames) {
				return cachedGames;
			}

			const igdbQuery = `
				search "${searchGameDto.query}";
				fields 
					slug,
					name,
					cover.url,
					platforms.checksum,
					platforms.name,
					involved_companies.checksum,
					involved_companies.company.name,
					involved_companies.developer,
					first_release_date;
				limit 10;
			`;

			const response = await firstValueFrom(
				this.httpService.post(`${this.IGDB_API_URL}/games`, igdbQuery, {
					headers: {
						"Client-ID": this.configService.get<string>("IGDB_CLIENT_ID"),
						Authorization: `Bearer ${accessToken}`,
					},
				}),
			);

			const games = response.data.map((igdbGame: any) => ({
				id: igdbGame.id,
				slug: igdbGame.slug,
				name: igdbGame.name,
				involvedCompanies:
					igdbGame?.involved_companies?.map((company: any) => ({
						checksum: company?.checksum ?? null,
						companyName: company?.company?.name ?? null,
						developer: company?.developer ?? false,
					})) ?? [],
				platforms:
					igdbGame?.platforms?.map((platform: any) => ({
						checksum: platform?.checksum ?? null,
						name: platform?.name ?? null,
					})) ?? [],
				coverUrl: igdbGame.cover?.url
					? `https:${igdbGame.cover.url.replace("t_thumb", "t_cover_big")}`
					: null,
				firstReleaseDate: igdbGame.first_release_date
					? new Date(igdbGame.first_release_date * 1000)
					: null,
			}));

			await this.cacheService.set(
				`igdb:search:${searchGameDto.query}`,
				games,
				3600 * 6,
			); // 6 hours

			return games;
		} catch (error) {
			this.logger.error(
				`Failed to search games on IGDB: ${error.message}`,
				error,
			);

			throw new AppException(ERROR_CODES.GAME_SERVICE_UNAVAILABLE);
		}
	}

	private async getGameBySlugFromIGDB(slug: string) {
		const igdbAccessToken = await this.getIGDBAccessToken();

		const igdbQuery = `
			fields 
				age_ratings.checksum,
				age_ratings.rating_category.rating,
				age_ratings.rating_cover_url,
				age_ratings.synopsis,
				age_ratings.organization.name,
				alternative_names.checksum,
				alternative_names.name,
				alternative_names.comment,
				artworks.checksum,
				artworks.artwork_type.name,
				artworks.url,
				bundles.name,
				bundles.slug,
				bundles.checksum,
				bundles.cover.url,
				checksum,
				collections.checksum,
				collections.name,
				collections.slug,
				collections.type.name,
				cover.url,
				created_at,
				dlcs.name,
				dlcs.slug,
				dlcs.checksum,
				dlcs.cover.url,
				expanded_games.name,
				expanded_games.slug,
				expanded_games.checksum,
				expanded_games.cover.url,
				expansions.name,
				expansions.slug,
				expansions.checksum,
				expansions.cover.url,
				external_games.game.name,
				external_games.game.slug,
				external_games.game.checksum,
				external_games.game.cover.url,
				first_release_date,
				forks.name,
				forks.slug,
				forks.checksum,
				forks.cover.url,
				franchise.name,
				franchise.slug,
				franchise.checksum,
				franchise.games.name,
				franchise.games.slug,
				franchise.games.checksum,
				franchise.games.cover.url,
				franchises.name,
				franchises.slug,
				franchises.checksum,
				franchises.games.name,
				franchises.games.slug,
				franchises.games.checksum,
				franchises.games.cover.url,
				game_engines.name,
				game_engines.slug,
				game_engines.checksum,
				game_localizations.checksum,
				game_localizations.region,
				game_modes.checksum,
				game_modes.name,
				game_modes.slug,
				game_status.checksum,
				game_status.status,
				game_type.checksum,
				game_type.type,
				genres.name,
				genres.slug,
				genres.checksum,
				involved_companies.checksum,
				involved_companies.company.name,
				involved_companies.developer,
				involved_companies.porting,
				involved_companies.publisher,
				involved_companies.supporting,
				keywords.checksum,
				keywords.name,
				keywords.slug,
				language_supports.checksum,
				language_supports.language.name,
				language_supports.language.locale,
				language_supports.language_support_type.name,
				multiplayer_modes.checksum,
				multiplayer_modes.campaigncoop,
				multiplayer_modes.dropin,
				multiplayer_modes.lancoop,
				multiplayer_modes.offlinecoop,
				multiplayer_modes.offlinecoopmax,
				multiplayer_modes.offlinemax,
				multiplayer_modes.onlinecoop,
				multiplayer_modes.onlinecoopmax,
				multiplayer_modes.onlinemax,
				multiplayer_modes.platform.name,
				multiplayer_modes.splitscreen,
				multiplayer_modes.splitscreenonline,
				name,
				parent_game.name,
				parent_game.slug,
				parent_game.checksum,
				parent_game.cover.url,
				platforms.checksum,
				platforms.name,
				player_perspectives.name,
				player_perspectives.slug,
				player_perspectives.checksum,
				ports.name,
				ports.slug,
				ports.checksum,
				ports.cover.url,
				release_dates.date,
				remakes.name,
				remakes.slug,
				remakes.checksum,
				remakes.cover.url,
				remasters.name,
				remasters.slug,
				remasters.checksum,
				remasters.cover.url,
				screenshots.checksum,
				screenshots.image_id,
				similar_games.name,
				similar_games.slug,
				similar_games.checksum,
				similar_games.cover.url,
				slug,
				standalone_expansions.name,
				standalone_expansions.slug,
				standalone_expansions.checksum,
				standalone_expansions.cover.url,
				summary,
				version_parent.name,
				version_parent.slug,
				version_parent.checksum,
				version_parent.cover.url,
				version_title,
				videos.checksum,
				videos.name,
				videos.video_id;
			where slug = "${slug}";
			limit 1;
		`;

		const response = await firstValueFrom(
			this.httpService.post(`${this.IGDB_API_URL}/games`, igdbQuery, {
				headers: {
					"Client-ID": this.configService.get<string>("IGDB_CLIENT_ID"),
					Authorization: `Bearer ${igdbAccessToken}`,
				},
			}),
		);

		const igdbGame = response.data[0];

		if (!igdbGame) {
			throw new AppException(ERROR_CODES.GAME_NOT_FOUND);
		}

		const game = {
			igdbId: igdbGame.id,
			ageRatings:
				igdbGame?.age_ratings?.map((rating: any) => ({
					category: rating?.rating_category?.rating ?? null,
					synopsis: rating?.synopsis ?? null,
					organization: rating?.organization?.name ?? null,
				})) ?? [],
			alternativeNames:
				igdbGame?.alternative_names?.map((altName: any) => ({
					checksum: altName?.checksum ?? null,
					name: altName?.name ?? null,
					comment: altName?.comment ?? null,
				})) ?? [],
			artworks:
				igdbGame?.artworks?.map((artwork: any) => ({
					checksum: artwork?.checksum ?? null,
					type: artwork?.artwork_type?.name ?? null,
					url: artwork?.url
						? `https:${artwork.url.replace("t_thumb", "t_1080p")}`
						: null,
				})) ?? [],
			checksum: igdbGame?.checksum ?? null,
			bundles:
				igdbGame?.bundles?.map((bundle: any) => ({
					name: bundle?.name ?? null,
					slug: bundle?.slug ?? null,
					coverUrl: bundle?.cover?.url
						? `https:${bundle.cover.url.replace("t_thumb", "t_cover_big")}`
						: null,
				})) ?? [],
			collections:
				igdbGame?.collections?.map((collection: any) => ({
					checksum: collection?.checksum ?? null,
					name: collection?.name ?? null,
					slug: collection?.slug ?? null,
					type: collection?.type?.name ?? null,
				})) ?? [],
			coverUrl: igdbGame.cover?.url
				? `https:${igdbGame.cover.url.replace("t_thumb", "t_cover_big")}`
				: null,
			dlcs:
				igdbGame?.dlcs?.map((dlc: any) => ({
					checksum: dlc?.checksum ?? null,
					name: dlc?.name ?? null,
					slug: dlc?.slug ?? null,
					coverUrl: dlc?.cover?.url
						? `https:${dlc.cover.url.replace("t_thumb", "t_cover_big")}`
						: null,
				})) ?? [],
			expandedGames:
				igdbGame?.expanded_games?.map((expGame: any) => ({
					checksum: expGame?.checksum ?? null,
					name: expGame?.name ?? null,
					slug: expGame?.slug ?? null,
					coverUrl: expGame?.cover?.url
						? `https:${expGame.cover.url.replace("t_thumb", "t_cover_big")}`
						: null,
				})) ?? [],
			expansions:
				igdbGame?.expansions?.map((expansion: any) => ({
					checksum: expansion?.checksum ?? null,
					name: expansion?.name ?? null,
					slug: expansion?.slug ?? null,
					coverUrl: expansion?.cover?.url
						? `https:${expansion.cover.url.replace("t_thumb", "t_cover_big")}`
						: null,
				})) ?? [],
			externalGames:
				igdbGame?.external_games?.map((extGame: any) => ({
					checksum: extGame?.game?.checksum ?? null,
					name: extGame?.game?.name ?? null,
					slug: extGame?.game?.slug ?? null,
					coverUrl: extGame?.game?.cover?.url
						? `https:${extGame.game.cover.url.replace("t_thumb", "t_cover_big")}`
						: null,
				})) ?? [],
			firstReleaseDate: igdbGame.first_release_date
				? new Date(igdbGame.first_release_date * 1000)
				: null,
			forks:
				igdbGame?.forks?.map((fork: any) => ({
					checksum: fork?.checksum ?? null,
					name: fork?.name ?? null,
					slug: fork?.slug ?? null,
					coverUrl: fork?.cover?.url
						? `https:${fork.cover.url.replace("t_thumb", "t_cover_big")}`
						: null,
				})) ?? [],
			franchise: igdbGame?.franchise
				? {
						checksum: igdbGame.franchise.checksum ?? null,
						name: igdbGame.franchise.name ?? null,
						slug: igdbGame.franchise.slug ?? null,
					}
				: {},
			franchises:
				igdbGame?.franchises?.map((franchise: any) => ({
					checksum: franchise?.checksum ?? null,
					name: franchise?.name ?? null,
					slug: franchise?.slug ?? null,
				})) ?? [],
			gameEngines:
				igdbGame?.game_engines?.map((engine: any) => ({
					checksum: engine?.checksum ?? null,
					name: engine?.name ?? null,
					slug: engine?.slug ?? null,
				})) ?? [],
			gameLocalizations:
				igdbGame?.game_localizations?.map((loc: any) => ({
					checksum: loc?.checksum ?? null,
					region: loc?.region ?? null,
				})) ?? [],
			gameModes:
				igdbGame?.game_modes?.map((mode: any) => ({
					checksum: mode?.checksum ?? null,
					name: mode?.name ?? null,
					slug: mode?.slug ?? null,
				})) ?? [],
			gameStatus: igdbGame?.game_status
				? {
						checksum: igdbGame.game_status.checksum ?? null,
						status: igdbGame.game_status.status ?? null,
					}
				: {},
			gameType: igdbGame?.game_type
				? {
						checksum: igdbGame.game_type.checksum ?? null,
						type: igdbGame.game_type.type ?? null,
					}
				: {},
			genres:
				igdbGame?.genres?.map((genre: any) => ({
					checksum: genre?.checksum ?? null,
					name: genre?.name ?? null,
					slug: genre?.slug ?? null,
				})) ?? [],
			involvedCompanies:
				igdbGame?.involved_companies?.map((company: any) => ({
					checksum: company?.checksum ?? null,
					companyName: company?.company?.name ?? null,
					developer: company?.developer ?? false,
					porting: company?.porting ?? false,
					publisher: company?.publisher ?? false,
					supporting: company?.supporting ?? false,
				})) ?? [],
			keywords:
				igdbGame?.keywords?.map((keyword: any) => ({
					checksum: keyword?.checksum ?? null,
					name: keyword?.name ?? null,
					slug: keyword?.slug ?? null,
				})) ?? [],
			multiplayerModes:
				igdbGame?.multiplayer_modes?.map((mode: any) => ({
					checksum: mode?.checksum ?? null,
					campaignCoop: mode?.campaigncoop ?? false,
					dropIn: mode?.dropin ?? false,
					lanCoop: mode?.lancoop ?? false,
					offlineCoop: mode?.offlinecoop ?? false,
					offlineCoopMax: mode?.offlinecoopmax ?? null,
					offlineMax: mode?.offlinemax ?? null,
					onlineCoop: mode?.onlinecoop ?? false,
					onlineCoopMax: mode?.onlinecoopmax ?? null,
					onlineMax: mode?.onlinemax ?? null,
					platform: mode?.platform?.name ?? null,
					splitScreen: mode?.splitscreen ?? false,
					splitScreenOnline: mode?.splitscreenonline ?? false,
				})) ?? [],
			name: igdbGame?.name ?? null,
			parentGame: igdbGame?.parent_game
				? {
						checksum: igdbGame.parent_game.checksum ?? null,
						name: igdbGame.parent_game.name ?? null,
						slug: igdbGame.parent_game.slug ?? null,
						coverUrl: igdbGame.parent_game.cover?.url
							? `https:${igdbGame.parent_game.cover.url.replace(
									"t_thumb",
									"t_cover_big",
								)}`
							: null,
					}
				: {},
			platforms:
				igdbGame?.platforms?.map((platform: any) => ({
					checksum: platform?.checksum ?? null,
					name: platform?.name ?? null,
				})) ?? [],
			playerPerspectives:
				igdbGame?.player_perspectives?.map((perspective: any) => ({
					checksum: perspective?.checksum ?? null,
					name: perspective?.name ?? null,
					slug: perspective?.slug ?? null,
				})) ?? [],
			ports:
				igdbGame?.ports?.map((port: any) => ({
					checksum: port?.checksum ?? null,
					name: port?.name ?? null,
					slug: port?.slug ?? null,
					coverUrl: port?.cover?.url
						? `https:${port.cover.url.replace("t_thumb", "t_cover_big")}`
						: null,
				})) ?? [],
			releaseDates:
				igdbGame?.release_dates?.map((rd: any) => ({
					date: rd?.date ? new Date(rd.date * 1000) : null,
				})) ?? [],
			remakes:
				igdbGame?.remakes?.map((remake: any) => ({
					checksum: remake?.checksum ?? null,
					name: remake?.name ?? null,
					slug: remake?.slug ?? null,
					coverUrl: remake?.cover?.url
						? `https:${remake.cover.url.replace("t_thumb", "t_cover_big")}`
						: null,
				})) ?? [],
			remasters:
				igdbGame?.remasters?.map((remaster: any) => ({
					checksum: remaster?.checksum ?? null,
					name: remaster?.name ?? null,
					slug: remaster?.slug ?? null,
					coverUrl: remaster?.cover?.url
						? `https:${remaster.cover.url.replace("t_thumb", "t_cover_big")}`
						: null,
				})) ?? [],
			screenshots:
				igdbGame?.screenshots?.map((screenshot: any) => ({
					checksum: screenshot?.checksum ?? null,
					imageId: screenshot?.image_id
						? `https://images.igdb.com/igdb/image/upload/t_1080p/${screenshot.image_id}.jpg`
						: null,
				})) ?? [],
			similarGames:
				igdbGame?.similar_games?.map((simGame: any) => ({
					checksum: simGame?.checksum ?? null,
					name: simGame?.name ?? null,
					slug: simGame?.slug ?? null,
					coverUrl: simGame?.cover?.url
						? `https:${simGame.cover.url.replace("t_thumb", "t_cover_big")}`
						: null,
				})) ?? [],
			slug: igdbGame?.slug ?? null,
			standaloneExpansions:
				igdbGame?.standalone_expansions?.map((expansion: any) => ({
					checksum: expansion?.checksum ?? null,
					name: expansion?.name ?? null,
					slug: expansion?.slug ?? null,
					coverUrl: expansion?.cover?.url
						? `https:${expansion.cover.url.replace("t_thumb", "t_cover_big")}`
						: null,
				})) ?? [],
			summary: igdbGame?.summary ?? null,
			versionParent: igdbGame?.version_parent
				? {
						checksum: igdbGame.version_parent.checksum ?? null,
						name: igdbGame.version_parent.name ?? null,
						slug: igdbGame.version_parent.slug ?? null,
						coverUrl: igdbGame.version_parent.cover?.url
							? `https:${igdbGame.version_parent.cover.url.replace(
									"t_thumb",
									"t_cover_big",
								)}`
							: null,
					}
				: {},
			versionTitle: igdbGame?.version_title ?? null,
			videos:
				igdbGame?.videos?.map((video: any) => ({
					checksum: video?.checksum ?? null,
					name: video?.name ?? null,
					videoId: video?.video_id
						? `https://www.youtube.com/embed/${video.video_id}`
						: null,
				})) ?? [],
		};

		// require('node:fs').writeFileSync('./game.json', JSON.stringify(game, null, 2)); // DEBUG

		return game;
	}

	async getGameById(id: string) {
		const cachedGame = await this.cacheService.get<any>(`game:id:${id}`);

		if (cachedGame) {
			return cachedGame;
		}

		const game = await this.prismaService.game.findUnique({
			where: { id },
		});

		if (!game) {
			throw new AppException(ERROR_CODES.GAME_NOT_FOUND);
		}

		await this.cacheService.set(`game:id:${id}`, game, 3600 * 6); // 6 hours

		return game;
	}

	async getGameBySlug(slug: string) {
		const cachedGame = await this.cacheService.get<any>(`game:slug:${slug}`);

		if (cachedGame) {
			return cachedGame;
		}

		let game = await this.prismaService.game.findUnique({
			where: { slug },
		});

		if (!game) {
			const igdbGame = await this.getGameBySlugFromIGDB(slug);

			game = await this.prismaService.game.create({
				data: igdbGame,
			});
		}

		await this.cacheService.set(`game:slug:${slug}`, game, 3600 * 6); // 6 hours

		return game;
	}

	async refreshGame(refreshGameDto: RefreshGameDto) {
		const game = await this.prismaService.game.findUnique({
			where: { id: refreshGameDto.id },
		});

		if (!game) {
			throw new AppException(ERROR_CODES.GAME_NOT_FOUND);
		}

		if (
			Date.now() - game.lastRefreshedAt.getTime() <
			24 * 60 * 60 * 1000 // 24 hours
		) {
			throw new AppException(ERROR_CODES.GAME_ALREADY_REFRESHED);
		}

		if (await this.cacheService.exists(`game:slug:${game.slug}`)) {
			await this.cacheService.delete(`game:slug:${game.slug}`);
		}

		const igdbGame = await this.getGameBySlugFromIGDB(game.slug);

		await this.prismaService.game.update({
			where: { id: refreshGameDto.id },
			data: igdbGame,
		});

		await this.cacheService.set(`game:slug:${game.slug}`, game, 3600 * 6); // 6 hours
	}
}
