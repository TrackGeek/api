import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CacheKeys, CacheService } from "../cache/cache.service";
import { firstValueFrom } from "rxjs";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ERROR_CODES } from "@/shared/constants/error-codes";

@Injectable()
export class IGDBService {
	private readonly IGDB_API_URL = "https://api.igdb.com/v4";

	constructor(
		private readonly httpService: HttpService,
		private readonly configService: ConfigService,
		private readonly cacheService: CacheService,
	) {}

	private get cacheKeys(): CacheKeys {
		return {
			accessToken: {
				prefix: () => "igdb:accessToken",
				expiration: 0,
			},
			searchGames: {
				prefix: (query: string) => `igdb:search:games:${query}`,
				expiration: 3600 * 6, // 6 hours
			},
			getGameById: {
				prefix: (id: number) => `igdb:game:id:${id}`,
				expiration: 3600 * 6, // 6 hours
			},
		}
	}

	private async getAccessToken(): Promise<string> {
		const cachedToken = await this.cacheService.get<string>(
			this.cacheKeys.accessToken.prefix(),
		);

		if (cachedToken) {
			return cachedToken;
		}

		const clientId = this.configService.get<string>("IGDB_CLIENT_ID");
		const clientSecret = this.configService.get<string>("IGDB_CLIENT_SECRET");

		try {
			const authResponse = await firstValueFrom(
				this.httpService.post("https://id.twitch.tv/oauth2/token", null, {
					params: {
						client_id: clientId,
						client_secret: clientSecret,
						grant_type: "client_credentials",
					},
				}),
			);

			const authData = authResponse.data;

			await this.cacheService.set(
				this.cacheKeys.accessToken.prefix(),
				authData.access_token,
				authData.expires_in - 300,
			);

			return authData.access_token;
		} catch (error) {
			throw new AppException(ERROR_CODES.IGDB_SERVICE_UNAVAILABLE);
		}
	}

	async searchGames(query: string): Promise<any> {
		const accessToken = await this.getAccessToken();

		try {
			const cachedGames = await this.cacheService.get<any[]>(
				this.cacheKeys.searchGames.prefix(query),
			);

			if (cachedGames) {
				return cachedGames;
			}

			const igdbQuery = `
        search "${query}";
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

			const gamesResponse = await firstValueFrom(
				this.httpService.post(`${this.IGDB_API_URL}/games`, igdbQuery, {
					headers: {
						"Client-ID": this.configService.get<string>("IGDB_CLIENT_ID"),
						Authorization: `Bearer ${accessToken}`,
					},
				}),
			);
			
			const gamesData = gamesResponse.data;

			const games = gamesData.map((game: any) => ({
				igdbId: game.id,
				slug: game.slug,
				name: game.name,
				involvedCompanies:
					game?.involved_companies?.map((company: any) => ({
						checksum: company?.checksum ?? null,
						companyName: company?.company?.name ?? null,
						developer: company?.developer ?? false,
					})) ?? [],
				platforms:
					game?.platforms?.map((platform: any) => ({
						checksum: platform?.checksum ?? null,
						name: platform?.name ?? null,
					})) ?? [],
				coverUrl: game.cover?.url
					? `https:${game.cover.url.replace("t_thumb", "t_cover_big")}`
					: null,
				firstReleaseDate: game.first_release_date
					? new Date(game.first_release_date * 1000)
					: null,
			}));

			await this.cacheService.set(
				this.cacheKeys.searchGames.prefix(query),
				games,
				this.cacheKeys.searchGames.expiration,
			);

			return games;
		} catch (error) {
			throw new AppException(ERROR_CODES.IGDB_SERVICE_UNAVAILABLE);
		}
	}

	async getGameById(id: number): Promise<any> {
		const accessToken = await this.getAccessToken();

		try {
			const cachedGame = await this.cacheService.get<any>(
				this.cacheKeys.getGameById.prefix(id),
			);

			if (cachedGame) {
				return cachedGame;
			}
			
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
				where id = ${id};
				limit 1;
			`;

			const gameResponse = await firstValueFrom(
				this.httpService.post(`${this.IGDB_API_URL}/games`, igdbQuery, {
					headers: {
						"Client-ID": this.configService.get<string>("IGDB_CLIENT_ID"),
						Authorization: `Bearer ${accessToken}`,
					},
				}),
			);

			const gameData = gameResponse.data[0];

			if (!gameData) {
				throw new AppException(ERROR_CODES.IGDB_GAME_NOT_FOUND);
			}

			const game = {
				igdbId: gameData.id,
				ageRatings:
					gameData?.age_ratings?.map((rating: any) => ({
						category: rating?.rating_category?.rating ?? null,
						synopsis: rating?.synopsis ?? null,
						organization: rating?.organization?.name ?? null,
					})) ?? [],
				alternativeNames:
					gameData?.alternative_names?.map((altName: any) => ({
						checksum: altName?.checksum ?? null,
						name: altName?.name ?? null,
						comment: altName?.comment ?? null,
					})) ?? [],
				artworks:
					gameData?.artworks?.map((artwork: any) => ({
						checksum: artwork?.checksum ?? null,
						type: artwork?.artwork_type?.name ?? null,
						url: artwork?.url
							? `https:${artwork.url.replace("t_thumb", "t_1080p")}`
							: null,
					})) ?? [],
				checksum: gameData?.checksum ?? null,
				bundles:
					gameData?.bundles?.map((bundle: any) => ({
						name: bundle?.name ?? null,
						slug: bundle?.slug ?? null,
						coverUrl: bundle?.cover?.url
							? `https:${bundle.cover.url.replace("t_thumb", "t_cover_big")}`
							: null,
					})) ?? [],
				collections:
					gameData?.collections?.map((collection: any) => ({
						checksum: collection?.checksum ?? null,
						name: collection?.name ?? null,
						slug: collection?.slug ?? null,
						type: collection?.type?.name ?? null,
					})) ?? [],
				coverUrl: gameData.cover?.url
					? `https:${gameData.cover.url.replace("t_thumb", "t_cover_big")}`
					: null,
				dlcs:
					gameData?.dlcs?.map((dlc: any) => ({
						checksum: dlc?.checksum ?? null,
						name: dlc?.name ?? null,
						slug: dlc?.slug ?? null,
						coverUrl: dlc?.cover?.url
							? `https:${dlc.cover.url.replace("t_thumb", "t_cover_big")}`
							: null,
					})) ?? [],
				expandedGames:
					gameData?.expanded_games?.map((expGame: any) => ({
						checksum: expGame?.checksum ?? null,
						name: expGame?.name ?? null,
						slug: expGame?.slug ?? null,
						coverUrl: expGame?.cover?.url
							? `https:${expGame.cover.url.replace("t_thumb", "t_cover_big")}`
							: null,
					})) ?? [],
				expansions:
					gameData?.expansions?.map((expansion: any) => ({
						checksum: expansion?.checksum ?? null,
						name: expansion?.name ?? null,
						slug: expansion?.slug ?? null,
						coverUrl: expansion?.cover?.url
							? `https:${expansion.cover.url.replace("t_thumb", "t_cover_big")}`
							: null,
					})) ?? [],
				externalGames:
					gameData?.external_games?.map((extGame: any) => ({
						checksum: extGame?.game?.checksum ?? null,
						name: extGame?.game?.name ?? null,
						slug: extGame?.game?.slug ?? null,
						coverUrl: extGame?.game?.cover?.url
							? `https:${extGame.game.cover.url.replace("t_thumb", "t_cover_big")}`
							: null,
					})) ?? [],
				firstReleaseDate: gameData.first_release_date
					? new Date(gameData.first_release_date * 1000)
					: null,
				forks:
					gameData?.forks?.map((fork: any) => ({
						checksum: fork?.checksum ?? null,
						name: fork?.name ?? null,
						slug: fork?.slug ?? null,
						coverUrl: fork?.cover?.url
							? `https:${fork.cover.url.replace("t_thumb", "t_cover_big")}`
							: null,
					})) ?? [],
				franchise: gameData?.franchise
					? {
							checksum: gameData.franchise.checksum ?? null,
							name: gameData.franchise.name ?? null,
							slug: gameData.franchise.slug ?? null,
						}
					: {},
				franchises:
					gameData?.franchises?.map((franchise: any) => ({
						checksum: franchise?.checksum ?? null,
						name: franchise?.name ?? null,
						slug: franchise?.slug ?? null,
					})) ?? [],
				gameEngines:
					gameData?.game_engines?.map((engine: any) => ({
						checksum: engine?.checksum ?? null,
						name: engine?.name ?? null,
						slug: engine?.slug ?? null,
					})) ?? [],
				gameLocalizations:
					gameData?.game_localizations?.map((loc: any) => ({
						checksum: loc?.checksum ?? null,
						region: loc?.region ?? null,
					})) ?? [],
				gameModes:
					gameData?.game_modes?.map((mode: any) => ({
						checksum: mode?.checksum ?? null,
						name: mode?.name ?? null,
						slug: mode?.slug ?? null,
					})) ?? [],
				gameStatus: gameData?.game_status
					? {
							checksum: gameData.game_status.checksum ?? null,
							status: gameData.game_status.status ?? null,
						}
					: {},
				gameType: gameData?.game_type
					? {
							checksum: gameData.game_type.checksum ?? null,
							type: gameData.game_type.type ?? null,
						}
					: {},
				genres:
					gameData?.genres?.map((genre: any) => ({
						checksum: genre?.checksum ?? null,
						name: genre?.name ?? null,
						slug: genre?.slug ?? null,
					})) ?? [],
				involvedCompanies:
					gameData?.involved_companies?.map((company: any) => ({
						checksum: company?.checksum ?? null,
						companyName: company?.company?.name ?? null,
						developer: company?.developer ?? false,
						porting: company?.porting ?? false,
						publisher: company?.publisher ?? false,
						supporting: company?.supporting ?? false,
					})) ?? [],
				keywords:
					gameData?.keywords?.map((keyword: any) => ({
						checksum: keyword?.checksum ?? null,
						name: keyword?.name ?? null,
						slug: keyword?.slug ?? null,
					})) ?? [],
				multiplayerModes:
					gameData?.multiplayer_modes?.map((mode: any) => ({
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
				name: gameData?.name ?? null,
				parentGame: gameData?.parent_game
					? {
							checksum: gameData.parent_game.checksum ?? null,
							name: gameData.parent_game.name ?? null,
							slug: gameData.parent_game.slug ?? null,
							coverUrl: gameData.parent_game.cover?.url
								? `https:${gameData.parent_game.cover.url.replace(
										"t_thumb",
										"t_cover_big",
									)}`
								: null,
						}
					: {},
				platforms:
					gameData?.platforms?.map((platform: any) => ({
						checksum: platform?.checksum ?? null,
						name: platform?.name ?? null,
					})) ?? [],
				playerPerspectives:
					gameData?.player_perspectives?.map((perspective: any) => ({
						checksum: perspective?.checksum ?? null,
						name: perspective?.name ?? null,
						slug: perspective?.slug ?? null,
					})) ?? [],
				ports:
					gameData?.ports?.map((port: any) => ({
						checksum: port?.checksum ?? null,
						name: port?.name ?? null,
						slug: port?.slug ?? null,
						coverUrl: port?.cover?.url
							? `https:${port.cover.url.replace("t_thumb", "t_cover_big")}`
							: null,
					})) ?? [],
				releaseDates:
					gameData?.release_dates?.map((rd: any) => ({
						date: rd?.date ? new Date(rd.date * 1000) : null,
					})) ?? [],
				remakes:
					gameData?.remakes?.map((remake: any) => ({
						checksum: remake?.checksum ?? null,
						name: remake?.name ?? null,
						slug: remake?.slug ?? null,
						coverUrl: remake?.cover?.url
							? `https:${remake.cover.url.replace("t_thumb", "t_cover_big")}`
							: null,
					})) ?? [],
				remasters:
					gameData?.remasters?.map((remaster: any) => ({
						checksum: remaster?.checksum ?? null,
						name: remaster?.name ?? null,
						slug: remaster?.slug ?? null,
						coverUrl: remaster?.cover?.url
							? `https:${remaster.cover.url.replace("t_thumb", "t_cover_big")}`
							: null,
					})) ?? [],
				screenshots:
					gameData?.screenshots?.map((screenshot: any) => ({
						checksum: screenshot?.checksum ?? null,
						imageId: screenshot?.image_id
							? `https://images.igdb.com/igdb/image/upload/t_1080p/${screenshot.image_id}.jpg`
							: null,
					})) ?? [],
				similarGames:
					gameData?.similar_games?.map((simGame: any) => ({
						checksum: simGame?.checksum ?? null,
						name: simGame?.name ?? null,
						slug: simGame?.slug ?? null,
						coverUrl: simGame?.cover?.url
							? `https:${simGame.cover.url.replace("t_thumb", "t_cover_big")}`
							: null,
					})) ?? [],
				slug: gameData?.slug ?? null,
				standaloneExpansions:
					gameData?.standalone_expansions?.map((expansion: any) => ({
						checksum: expansion?.checksum ?? null,
						name: expansion?.name ?? null,
						slug: expansion?.slug ?? null,
						coverUrl: expansion?.cover?.url
							? `https:${expansion.cover.url.replace("t_thumb", "t_cover_big")}`
							: null,
					})) ?? [],
				summary: gameData?.summary ?? null,
				versionParent: gameData?.version_parent
					? {
							checksum: gameData.version_parent.checksum ?? null,
							name: gameData.version_parent.name ?? null,
							slug: gameData.version_parent.slug ?? null,
							coverUrl: gameData.version_parent.cover?.url
								? `https:${gameData.version_parent.cover.url.replace(
										"t_thumb",
										"t_cover_big",
									)}`
								: null,
						}
					: {},
				versionTitle: gameData?.version_title ?? null,
				videos:
					gameData?.videos?.map((video: any) => ({
						checksum: video?.checksum ?? null,
						name: video?.name ?? null,
						videoId: video?.video_id
							? `https://www.youtube.com/embed/${video.video_id}`
							: null,
					})) ?? [],
			};
			
			await this.cacheService.set(
				this.cacheKeys.getGameById.prefix(id),
				game,
				this.cacheKeys.getGameById.expiration,
			);

			return game;
		} catch (error) {
			throw new AppException(ERROR_CODES.IGDB_SERVICE_UNAVAILABLE);
		}
	}
}
