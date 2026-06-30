import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { DEFAULT_PAGINATION_ITEMS_PER_PAGE, DEFAULT_PAGINATION_PAGE } from "@/shared/infra/database/database.service";
import { CacheService } from "../cache/cache.service";

export interface IGDBPagination<I> {
  total: number | null;
  pages: number | null;
  inPage: number;
  itemsInPage: number;
  itemsPerPage: number | null;
  items: I[];
}

export enum IGDBGameFilter {
  Popular = "popular",
  Coming = "coming",
  Antecipated = "antecipated",
  RecentlyReleased = "recentlyReleased",
}

export enum IGDBGameOrderBy {
  Name = "name",
  TotalRating = "total_rating",
  Popularity = "popularity",
  FirstReleaseDate = "first_release_date",
}

export enum IGDBSort {
  Desc = "desc",
  Asc = "asc",
}

export interface IGDBTopGameOptions {
  page?: number;
  filter?: IGDBGameFilter;
}

export interface IGDBTopGameResult {
  igdbId: number;
  slug: string;
  name: string;
  involvedCompanies: {
    checksum: string | null;
    companyName: string | null;
    developer: boolean;
  }[];
  platforms: {
    checksum: string | null;
    name: string | null;
  }[];
  artworks: {
    checksum: string | null;
    type: string | null;
    url: string | null;
  }[];
  coverUrl: string | null;
  firstReleaseDate: Date | null;
}

export interface IGDBSearchGameOptions {
  query?: string;
  page?: number;
  sort?: IGDBSort;
  orderBy?: IGDBGameOrderBy;
  genres?: string[];
  gameMode?: string;
  platform?: string;
  status?: string;
  year?: string;
}

export interface IGDBSearchGameResult {
  igdbId: number;
  slug: string;
  name: string;
  involvedCompanies: {
    checksum: string | null;
    companyName: string | null;
    developer: boolean;
  }[];
  platforms: {
    checksum: string | null;
    name: string | null;
  }[];
  coverUrl: string | null;
  firstReleaseDate: Date | null;
}

interface IGDBGameRef {
  checksum: string | null;
  name: string | null;
  slug: string | null;
  coverUrl: string | null;
}

export interface IGDBGenre {
  checksum: string | null;
  name: string | null;
  slug: string | null;
}

export interface IGDBGameStatus {
  name: string | null;
  slug: string | null;
}

export interface IGDBGameMode {
  checksum: string | null;
  name: string | null;
  slug: string | null;
}

export interface IGDBGamePlatform {
  checksum: string | null;
  name: string | null;
  slug: string | null;
  generation: number | null;
}

export interface IGDBGameDetails {
  igdbId: number;
  ageRatings: {
    category: string | null;
    synopsis: string | null;
    organization: string | null;
  }[];
  alternativeNames: {
    checksum: string | null;
    name: string | null;
    comment: string | null;
  }[];
  artworks: {
    checksum: string | null;
    type: string | null;
    url: string | null;
  }[];
  checksum: string | null;
  bundles: IGDBGameRef[];
  collections: {
    checksum: string | null;
    name: string | null;
    slug: string | null;
    type: string | null;
  }[];
  coverUrl: string | null;
  dlcs: IGDBGameRef[];
  expandedGames: IGDBGameRef[];
  expansions: IGDBGameRef[];
  externalGames: IGDBGameRef[];
  firstReleaseDate: Date | null;
  forks: IGDBGameRef[];
  franchise: {
    checksum: string | null;
    name: string | null;
    slug: string | null;
  } | null;
  franchises: {
    checksum: string | null;
    name: string | null;
    slug: string | null;
  }[];
  gameEngines: {
    checksum: string | null;
    name: string | null;
    slug: string | null;
  }[];
  gameLocalizations: {
    checksum: string | null;
    region: string | null;
  }[];
  igdbReviewScore: number | null;
  gameModes: IGDBGameMode[];
  gameStatus: string | null;
  gameType: {
    checksum: string | null;
    type: string | null;
  } | null;
  genres: IGDBGenre[];
  involvedCompanies: {
    checksum: string | null;
    companyName: string | null;
    developer: boolean;
    porting: boolean;
    publisher: boolean;
    supporting: boolean;
  }[];
  keywords: {
    checksum: string | null;
    name: string | null;
    slug: string | null;
  }[];
  multiplayerModes: {
    checksum: string | null;
    campaignCoop: boolean;
    dropIn: boolean;
    lanCoop: boolean;
    offlineCoop: boolean;
    offlineCoopMax: number | null;
    offlineMax: number | null;
    onlineCoop: boolean;
    onlineCoopMax: number | null;
    onlineMax: number | null;
    platform: string | null;
    splitScreen: boolean;
    splitScreenOnline: boolean;
  }[];
  name: string | null;
  parentGame: {
    id: string | null;
    name: string | null;
    slug: string | null;
    coverUrl: string | null;
  } | null;
  platforms: IGDBGamePlatform[];
  playerPerspectives: {
    checksum: string | null;
    name: string | null;
    slug: string | null;
  }[];
  ports: IGDBGameRef[];
  releaseDates: {
    date: Date | null;
  }[];
  remakes: IGDBGameRef[];
  remasters: IGDBGameRef[];
  screenshots: {
    checksum: string | null;
    imageId: string | null;
  }[];
  similarGames: IGDBGameRef[];
  slug: string | null;
  standaloneExpansions: IGDBGameRef[];
  summary: string | null;
  themes: string[];
  versionParent: {
    checksum: string | null;
    name: string | null;
    slug: string | null;
    coverUrl: string | null;
  } | null;
  versionTitle: string | null;
  videos: {
    checksum: string | null;
    name: string | null;
    videoId: string | null;
  }[];
  websites: {
    name: string | null;
    url: string | null;
  }[];
}

@Injectable()
export class IGDBService {
  private readonly logger = new Logger(IGDBService.name);

  private readonly IGDB_API_URL = "https://api.igdb.com/v4";

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  private async getAccessToken(): Promise<string> {
    const cachedToken = await this.cacheService.get<string>(CACHE_KEYS.IGDB_ACCESS_TOKEN);

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

      await this.cacheService.set(CACHE_KEYS.IGDB_ACCESS_TOKEN, authData.access_token, authData.expires_in - 300);

      return authData.access_token;
    } catch (_error) {
      throw new AppException(ERROR_CODES.IGDB_SERVICE_UNAVAILABLE);
    }
  }

  async searchGames({
    query,
    page = DEFAULT_PAGINATION_PAGE,
    sort = IGDBSort.Desc,
    orderBy = IGDBGameOrderBy.Popularity,
    gameMode,
    genres,
    platform,
    year,
    status,
  }: IGDBSearchGameOptions): Promise<IGDBPagination<IGDBSearchGameResult>> {
    const accessToken = await this.getAccessToken();

    try {
      const cachedGamesKey = CACHE_KEYS.IGDB_SEARCH_GAMES.prefix({
        query,
        page,
        sort,
        orderBy,
        gameMode,
        platform,
        genres: genres ? genres.join(",") : undefined,
        year,
        status,
      });

      const cachedGames = await this.cacheService.get<IGDBPagination<IGDBSearchGameResult>>(cachedGamesKey);

      if (cachedGames) {
        return cachedGames;
      }

      const limit = DEFAULT_PAGINATION_ITEMS_PER_PAGE;
      const offset = (page - 1) * limit;

      const whereConditions = [
        query ? `name ~ *"${query}"*` : null,
        gameMode ? `game_modes.slug = "${gameMode}"` : null,
        genres ? `genres.slug = (${genres.map((genre) => `"${genre}"`).join(",")})` : null,
        platform ? `platforms.slug = "${platform}"` : null,
        year
          ? `first_release_date >= ${Math.floor(new Date(Number(year), 0, 1).getTime() / 1000)} & first_release_date < ${Math.floor(new Date(Number(year) + 1, 0, 1).getTime() / 1000)}`
          : null,
        status ? (status === "Not Released" ? "game_status = null" : `game_status.status = "${status}"`) : null,
      ].filter(Boolean);

      const whereClause = whereConditions.length ? `where ${whereConditions.join(" & ")};` : "";
      
      const igdbSearchQuery = `
        fields
          slug,
          name,
          cover.url,
          platforms.checksum,
          platforms.name,
          platforms.slug,
          game_status.status,
          involved_companies.checksum,
          involved_companies.company.name,
          involved_companies.developer,
          genres.name,
          genres.slug,
          genres.checksum,
          game_modes.checksum,
					game_modes.name,
					game_modes.slug,
          total_rating,
          first_release_date;
        ${whereClause}
        sort ${orderBy} ${sort};
        limit ${limit};
        offset ${offset};
      `;

      const igdbCountQuery = `
        ${whereClause};
      `;

      const headers = {
        "Client-ID": this.configService.get<string>("IGDB_CLIENT_ID"),
        Authorization: `Bearer ${accessToken}`,
      };

      const [gamesResponse, countResponse] = await Promise.all([
        firstValueFrom(this.httpService.post(`${this.IGDB_API_URL}/games`, igdbSearchQuery, { headers })),
        firstValueFrom(this.httpService.post(`${this.IGDB_API_URL}/games/count`, igdbCountQuery, { headers })),
      ]);

      const gamesData = gamesResponse.data;
      const total: number = countResponse.data.count;

      const items = gamesData.map((game: any) => ({
        igdbId: game.id,
        igdbReviewScore: game.total_rating ?? null,
        slug: game.slug,
        name: game.name,
        gameStatus: game?.game_status?.status
          ? game?.game_status?.status
          : game.first_release_date
            ? new Date(game.first_release_date * 1000) <= new Date()
              ? "Released"
              : "Not Released"
            : "Not Released",
        gameModes:
          game?.game_modes?.map((mode: any) => ({
            checksum: mode?.checksum ?? null,
            name: mode?.name ?? null,
            slug: mode?.slug ?? null,
          })) ?? [],
        genres:
          game?.genres?.map((genre: any) => ({
            checksum: genre?.checksum ?? null,
            name: genre?.name ?? null,
            slug: genre?.slug ?? null,
          })) ?? [],
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
            slug: platform?.slug ?? null,
          })) ?? [],
        coverUrl: game.cover?.url ? `https:${game.cover.url.replace("t_thumb", "t_cover_big")}` : null,
        firstReleaseDate: game.first_release_date ? new Date(game.first_release_date * 1000) : null,
      }));

      const games: IGDBPagination<IGDBSearchGameResult> = {
        total,
        pages: Math.ceil(total / limit),
        inPage: page,
        itemsInPage: items.length,
        itemsPerPage: limit,
        items,
      };

      await this.cacheService.set<IGDBPagination<IGDBSearchGameResult>>(
        cachedGamesKey,
        games,
        CACHE_KEYS.IGDB_SEARCH_GAMES.expiration,
      );

      return games;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.GAME_NOT_FOUND);
      }

      this.logger.error(`Error searching games in IGDB: ${error.message}`, error);

      throw new AppException(ERROR_CODES.IGDB_SERVICE_UNAVAILABLE);
    }
  }

  async getGameGenres(): Promise<IGDBGenre[]> {
    const accessToken = await this.getAccessToken();

    try {
      const cachedGenres = await this.cacheService.get<IGDBGenre[]>(CACHE_KEYS.IGDB_GAME_GENRES.prefix);

      if (cachedGenres) {
        return cachedGenres;
      }

      const igdbQuery = `
        fields name, slug, checksum;
        limit 100;
      `;

      const headers = {
        "Client-ID": this.configService.get<string>("IGDB_CLIENT_ID"),
        Authorization: `Bearer ${accessToken}`,
      };

      const genresResponse = await firstValueFrom(
        this.httpService.post(`${this.IGDB_API_URL}/genres`, igdbQuery, { headers }),
      );

      const genresData = genresResponse.data;

      const genres = genresData.map((genre: any) => ({
        name: genre.name,
        slug: genre.slug,
        checksum: genre.checksum,
      }));

      await this.cacheService.set<IGDBGenre[]>(
        CACHE_KEYS.IGDB_GAME_GENRES.prefix,
        genres,
        CACHE_KEYS.IGDB_GAME_GENRES.expiration,
      );

      return genres;
    } catch (error: any) {
      this.logger.error(`Error fetching game genres from IGDB: ${error.message}`, error.stack);

      throw new AppException(ERROR_CODES.IGDB_SERVICE_UNAVAILABLE);
    }
  }

  async getGameModes(): Promise<IGDBGameMode[]> {
    const accessToken = await this.getAccessToken();

    try {
      const cachedModes = await this.cacheService.get<IGDBGameMode[]>(CACHE_KEYS.IGDB_GAME_MODES.prefix);

      if (cachedModes) {
        return cachedModes;
      }

      const igdbQuery = `
        fields name, slug, checksum;
        limit 100;
      `;

      const headers = {
        "Client-ID": this.configService.get<string>("IGDB_CLIENT_ID"),
        Authorization: `Bearer ${accessToken}`,
      };

      const modesResponse = await firstValueFrom(
        this.httpService.post(`${this.IGDB_API_URL}/game_modes`, igdbQuery, { headers }),
      );

      const modesData = modesResponse.data;

      const modes = modesData.map((mode: any) => ({
        name: mode.name,
        slug: mode.slug,
        checksum: mode.checksum,
      }));

      await this.cacheService.set<IGDBGameMode[]>(
        CACHE_KEYS.IGDB_GAME_MODES.prefix,
        modes,
        CACHE_KEYS.IGDB_GAME_MODES.expiration,
      );

      return modes;
    } catch (error: any) {
      this.logger.error(`Error fetching game modes from IGDB: ${error.message}`, error.stack);

      throw new AppException(ERROR_CODES.IGDB_SERVICE_UNAVAILABLE);
    }
  }

  async getGamePlatforms(): Promise<IGDBGamePlatform[]> {
    const accessToken = await this.getAccessToken();

    try {
      const cachedPlatforms = await this.cacheService.get<IGDBGamePlatform[]>(CACHE_KEYS.IGDB_GAME_PLATFORMS.prefix);

      if (cachedPlatforms) {
        return cachedPlatforms;
      }

      const igdbQuery = `
        fields name, slug, platform_type, checksum, generation;
        sort generation desc;
        limit 200;
      `;

      const headers = {
        "Client-ID": this.configService.get<string>("IGDB_CLIENT_ID"),
        Authorization: `Bearer ${accessToken}`,
      };

      const platformsResponse = await firstValueFrom(
        this.httpService.post(`${this.IGDB_API_URL}/platforms`, igdbQuery, { headers }),
      );

      const platformsData = platformsResponse.data;

      const platforms = platformsData.map((platform: any) => ({
        name: platform.name,
        slug: platform.slug,
        type: platform.platform_type,
        generation: platform.generation,
        checksum: platform.checksum,
      }));

      await this.cacheService.set<IGDBGamePlatform[]>(
        CACHE_KEYS.IGDB_GAME_PLATFORMS.prefix,
        platforms,
        CACHE_KEYS.IGDB_GAME_PLATFORMS.expiration,
      );

      return platforms;
    } catch (error: any) {
      this.logger.error(`Error fetching game platforms from IGDB: ${error.message}`, error.stack);

      throw new AppException(ERROR_CODES.IGDB_SERVICE_UNAVAILABLE);
    }
  }

  async getGameStatus(): Promise<IGDBGameStatus[]> {
    const accessToken = await this.getAccessToken();

    try {
      const cachedGameStatus = await this.cacheService.get<IGDBGameStatus[]>(CACHE_KEYS.IGDB_GAME_STATUS.prefix);

      if (cachedGameStatus) {
        return cachedGameStatus;
      }

      const igdbQuery = `
        fields status;
        limit 100;
      `;

      const headers = {
        "Client-ID": this.configService.get<string>("IGDB_CLIENT_ID"),
        Authorization: `Bearer ${accessToken}`,
      };

      const gameStatusResponse = await firstValueFrom(
        this.httpService.post(`${this.IGDB_API_URL}/game_statuses`, igdbQuery, { headers }),
      );

      const gameStatusData = gameStatusResponse.data;

      const gameStatus = gameStatusData.map((status: any) => status.status);

      await this.cacheService.set<IGDBGameStatus[]>(
        CACHE_KEYS.IGDB_GAME_STATUS.prefix,
        gameStatus,
        CACHE_KEYS.IGDB_GAME_STATUS.expiration,
      );

      return [...gameStatus, "Not Released"];
    } catch (error: any) {
      this.logger.error(`Error fetching game statuses from IGDB: ${error.message}`, error.stack);

      throw new AppException(ERROR_CODES.IGDB_SERVICE_UNAVAILABLE);
    }
  }

  async topGames({
    page = DEFAULT_PAGINATION_PAGE,
    filter = IGDBGameFilter.Popular,
  }: IGDBTopGameOptions): Promise<IGDBPagination<IGDBTopGameResult>> {
    const accessToken = await this.getAccessToken();

    try {
      const topGamesOptions = { page, filter };
      const cachedGames = await this.cacheService.get<IGDBPagination<IGDBTopGameResult>>(
        CACHE_KEYS.IGDB_TOP_GAMES.prefix({ ...topGamesOptions }),
      );

      if (cachedGames) {
        return cachedGames;
      }

      const now = Math.floor(Date.now() / 1000);
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60;
      const ninetyDaysAhead = now + 90 * 24 * 60 * 60;
      const twoYearsAgo = now - 2 * 365 * 24 * 60 * 60;

      const limit = DEFAULT_PAGINATION_ITEMS_PER_PAGE;
      const offset = (page - 1) * limit;

      const queries: Record<IGDBGameFilter, string> = {
        popular: `
          fields
            slug, name, cover.url,
		        artworks.checksum, artworks.artwork_type.name, artworks.url,
            platforms.checksum, platforms.name, platforms.slug,
            involved_companies.checksum, involved_companies.company.name, involved_companies.developer,
            summary,
            first_release_date;
          where rating_count > 50
            & rating >= 70
            & first_release_date > ${twoYearsAgo}
            & first_release_date < ${now}
            & cover != null;
          sort rating_count desc;
          limit ${limit};
          offset ${offset};
        `,
        coming: `
          fields
            slug, name, cover.url,
		        artworks.checksum, artworks.artwork_type.name, artworks.url,
            platforms.checksum, platforms.name, platforms.slug,
            involved_companies.checksum, involved_companies.company.name, involved_companies.developer,
            summary,
            first_release_date;
          where first_release_date > ${now}
            & first_release_date < ${ninetyDaysAhead}
            & cover != null;
          sort first_release_date asc;
          limit ${limit};
          offset ${offset};
        `,
        antecipated: `
          fields
            slug, name, cover.url,
			      artworks.checksum, artworks.artwork_type.name, artworks.url,
            platforms.checksum, platforms.name, platforms.slug,
            involved_companies.checksum, involved_companies.company.name, involved_companies.developer,
            summary,
            first_release_date;
          where first_release_date > ${now}
            & cover != null
            & hypes != null;
          sort hypes desc;
          limit ${limit};
          offset ${offset};
        `,
        recentlyReleased: `
          fields
            slug, name, cover.url,
			      artworks.checksum, artworks.artwork_type.name, artworks.url,
            platforms.checksum, platforms.name, platforms.slug,
            involved_companies.checksum, involved_companies.company.name, involved_companies.developer,
            summary,
            first_release_date;
          where first_release_date > ${thirtyDaysAgo}
            & first_release_date < ${now}
            & cover != null;
          sort first_release_date desc;
          limit ${limit};
          offset ${offset};
        `,
      };

      const gamesResponse = await firstValueFrom(
        this.httpService.post(`${this.IGDB_API_URL}/games`, queries[filter as IGDBGameFilter], {
          headers: {
            "Client-ID": this.configService.get<string>("IGDB_CLIENT_ID"),
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );

      const gamesData = gamesResponse.data;

      const items = gamesData.map((game: any) => ({
        igdbId: game.id,
        slug: game.slug,
        name: game.name,
        involvedCompanies:
          game?.involved_companies?.map((company: any) => ({
            checksum: company?.checksum ?? null,
            companyName: company?.company?.name ?? null,
            developer: company?.developer ?? false,
          })) ?? [],
        artworks:
          game?.artworks?.map((artwork: any) => ({
            checksum: artwork?.checksum ?? null,
            type: artwork?.artwork_type?.name ?? null,
            url: artwork?.url ? `https:${artwork.url.replace("t_thumb", "t_1080p")}` : null,
          })) ?? [],
        platforms:
          game?.platforms?.map((platform: any) => ({
            checksum: platform?.checksum ?? null,
            slug: platform?.slug ?? null,
            name: platform?.name ?? null,
          })) ?? [],
        summary: game?.summary,
        coverUrl: game.cover?.url ? `https:${game.cover.url.replace("t_thumb", "t_cover_big")}` : null,
        firstReleaseDate: game.first_release_date ? new Date(game.first_release_date * 1000) : null,
      }));

      const topGames: IGDBPagination<IGDBTopGameResult> = {
        total: null,
        pages: null,
        inPage: page,
        itemsInPage: items.length,
        itemsPerPage: limit,
        items,
      };

      await this.cacheService.set<IGDBPagination<IGDBTopGameResult>>(
        CACHE_KEYS.IGDB_TOP_GAMES.prefix({ ...topGamesOptions }),
        topGames,
        CACHE_KEYS.IGDB_TOP_GAMES.expiration,
      );

      return topGames;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.GAME_NOT_FOUND);
      }

      throw new AppException(ERROR_CODES.IGDB_SERVICE_UNAVAILABLE);
    }
  }

  async getGameById(id: number): Promise<IGDBGameDetails> {
    const accessToken = await this.getAccessToken();

    try {
      const cachedGame = await this.cacheService.get<IGDBGameDetails>(CACHE_KEYS.IGDB_GAME_BY_ID.prefix(id));

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
					bundles.id,
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
					dlcs.id,
					dlcs.cover.url,
					expanded_games.name,
					expanded_games.slug,
					expanded_games.id,
					expanded_games.cover.url,
					expansions.name,
					expansions.slug,
					expansions.id,
					expansions.cover.url,
					external_games.game.name,
					external_games.game.slug,
					external_games.game.id,
					external_games.game.cover.url,
					first_release_date,
					forks.name,
					forks.slug,
					forks.id,
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
					franchises.id,
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
					parent_game.id,
					parent_game.cover.url,
					platforms.checksum,
					platforms.name,
          platforms.slug,
          platforms.platform_type,
          platforms.generation,
					player_perspectives.name,
					player_perspectives.slug,
					player_perspectives.checksum,
					ports.name,
					ports.slug,
					ports.id,
					ports.cover.url,
					release_dates.date,
					remakes.name,
					remakes.slug,
					remakes.id,
					remakes.cover.url,
					remasters.name,
					remasters.slug,
					remasters.id,
					remasters.cover.url,
					screenshots.checksum,
					screenshots.image_id,
					similar_games.name,
					similar_games.slug,
					similar_games.id,
					similar_games.cover.url,
					slug,
					standalone_expansions.name,
					standalone_expansions.slug,
					standalone_expansions.id,
					standalone_expansions.cover.url,
					summary,
          total_rating,
					themes.name,
					version_parent.name,
					version_parent.slug,
					version_parent.checksum,
					version_parent.cover.url,
					version_title,
					videos.checksum,
					videos.name,
					videos.video_id,
					websites.url,
					websites.type.type;
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
        igdbReviewScore: gameData.total_rating ?? null,
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
            url: artwork?.url ? `https:${artwork.url.replace("t_thumb", "t_1080p")}` : null,
          })) ?? [],
        checksum: gameData?.checksum ?? null,
        bundles:
          gameData?.bundles?.map((bundle: any) => ({
            id: bundle?.id ?? null,
            name: bundle?.name ?? null,
            slug: bundle?.slug ?? null,
            coverUrl: bundle?.cover?.url ? `https:${bundle.cover.url.replace("t_thumb", "t_cover_big")}` : null,
          })) ?? [],
        collections:
          gameData?.collections?.map((collection: any) => ({
            checksum: collection?.checksum ?? null,
            name: collection?.name ?? null,
            slug: collection?.slug ?? null,
            type: collection?.type?.name ?? null,
          })) ?? [],
        coverUrl: gameData.cover?.url ? `https:${gameData.cover.url.replace("t_thumb", "t_cover_big")}` : null,
        dlcs:
          gameData?.dlcs?.map((dlc: any) => ({
            id: dlc?.id ?? null,
            name: dlc?.name ?? null,
            slug: dlc?.slug ?? null,
            coverUrl: dlc?.cover?.url ? `https:${dlc.cover.url.replace("t_thumb", "t_cover_big")}` : null,
          })) ?? [],
        expandedGames:
          gameData?.expanded_games?.map((expGame: any) => ({
            id: expGame?.id ?? null,
            name: expGame?.name ?? null,
            slug: expGame?.slug ?? null,
            coverUrl: expGame?.cover?.url ? `https:${expGame.cover.url.replace("t_thumb", "t_cover_big")}` : null,
          })) ?? [],
        expansions:
          gameData?.expansions?.map((expansion: any) => ({
            id: expansion?.id ?? null,
            name: expansion?.name ?? null,
            slug: expansion?.slug ?? null,
            coverUrl: expansion?.cover?.url ? `https:${expansion.cover.url.replace("t_thumb", "t_cover_big")}` : null,
          })) ?? [],
        externalGames:
          gameData?.external_games?.map((extGame: any) => ({
            id: extGame?.game?.id ?? null,
            name: extGame?.game?.name ?? null,
            slug: extGame?.game?.slug ?? null,
            coverUrl: extGame?.game?.cover?.url
              ? `https:${extGame.game.cover.url.replace("t_thumb", "t_cover_big")}`
              : null,
          })) ?? [],
        firstReleaseDate: gameData.first_release_date ? new Date(gameData.first_release_date * 1000) : null,
        forks:
          gameData?.forks?.map((fork: any) => ({
            id: fork?.id ?? null,
            name: fork?.name ?? null,
            slug: fork?.slug ?? null,
            coverUrl: fork?.cover?.url ? `https:${fork.cover.url.replace("t_thumb", "t_cover_big")}` : null,
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
            id: franchise?.id ?? null,
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
        gameStatus: gameData?.game_status?.status
          ? gameData?.game_status?.status
          : gameData.first_release_date
            ? new Date(gameData.first_release_date * 1000) <= new Date()
              ? "Released"
              : "Not Released"
            : "Not Released",
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
              id: gameData.parent_game.id ?? null,
              name: gameData.parent_game.name ?? null,
              slug: gameData.parent_game.slug ?? null,
              coverUrl: gameData.parent_game.cover?.url
                ? `https:${gameData.parent_game.cover.url.replace("t_thumb", "t_cover_big")}`
                : null,
            }
          : {},
        platforms:
          gameData?.platforms?.map((platform: any) => ({
            checksum: platform?.checksum ?? null,
            name: platform?.name ?? null,
            type: platform?.platform_type ?? null,
            slug: platform?.slug ?? null,
            generation: platform?.generation ?? null,
          })) ?? [],
        playerPerspectives:
          gameData?.player_perspectives?.map((perspective: any) => ({
            checksum: perspective?.checksum ?? null,
            name: perspective?.name ?? null,
            slug: perspective?.slug ?? null,
          })) ?? [],
        ports:
          gameData?.ports?.map((port: any) => ({
            id: port?.id ?? null,
            name: port?.name ?? null,
            slug: port?.slug ?? null,
            coverUrl: port?.cover?.url ? `https:${port.cover.url.replace("t_thumb", "t_cover_big")}` : null,
          })) ?? [],
        releaseDates:
          gameData?.release_dates?.map((rd: any) => ({
            date: rd?.date ? new Date(rd.date * 1000) : null,
          })) ?? [],
        remakes:
          gameData?.remakes?.map((remake: any) => ({
            id: remake?.id ?? null,
            name: remake?.name ?? null,
            slug: remake?.slug ?? null,
            coverUrl: remake?.cover?.url ? `https:${remake.cover.url.replace("t_thumb", "t_cover_big")}` : null,
          })) ?? [],
        remasters:
          gameData?.remasters?.map((remaster: any) => ({
            id: remaster?.id ?? null,
            name: remaster?.name ?? null,
            slug: remaster?.slug ?? null,
            coverUrl: remaster?.cover?.url ? `https:${remaster.cover.url.replace("t_thumb", "t_cover_big")}` : null,
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
            id: simGame?.id ?? null,
            name: simGame?.name ?? null,
            slug: simGame?.slug ?? null,
            coverUrl: simGame?.cover?.url ? `https:${simGame.cover.url.replace("t_thumb", "t_cover_big")}` : null,
          })) ?? [],
        slug: gameData?.slug ?? null,
        standaloneExpansions:
          gameData?.standalone_expansions?.map((expansion: any) => ({
            id: expansion?.id ?? null,
            name: expansion?.name ?? null,
            slug: expansion?.slug ?? null,
            coverUrl: expansion?.cover?.url ? `https:${expansion.cover.url.replace("t_thumb", "t_cover_big")}` : null,
          })) ?? [],
        summary: gameData?.summary ?? null,
        themes: gameData?.themes?.map((t: any) => t.name),
        versionParent: gameData?.version_parent
          ? {
              checksum: gameData.version_parent.checksum ?? null,
              name: gameData.version_parent.name ?? null,
              slug: gameData.version_parent.slug ?? null,
              coverUrl: gameData.version_parent.cover?.url
                ? `https:${gameData.version_parent.cover.url.replace("t_thumb", "t_cover_big")}`
                : null,
            }
          : {},
        versionTitle: gameData?.version_title ?? null,
        videos:
          gameData?.videos?.map((video: any) => ({
            checksum: video?.checksum ?? null,
            name: video?.name ?? null,
            videoId: video?.video_id ? `https://www.youtube.com/embed/${video.video_id}` : null,
          })) ?? [],
        websites: gameData?.websites?.map((website: any) => ({
          name: website?.type?.type ?? null,
          url: website?.url ?? null,
        })),
      } as IGDBGameDetails;

      await this.cacheService.set(CACHE_KEYS.IGDB_GAME_BY_ID.prefix(id), game, CACHE_KEYS.IGDB_GAME_BY_ID.expiration);

      return game;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.GAME_NOT_FOUND);
      }

      throw new AppException(ERROR_CODES.IGDB_SERVICE_UNAVAILABLE);
    }
  }
}
