import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { manyRequestWithDelay } from "@/shared/utils/request";
import { CacheService } from "../cache/cache.service";
import { DEFAULT_PAGINATION_ITEMS_PER_PAGE, DEFAULT_PAGINATION_PAGE } from "../database/database.service";

export interface TenraiPagination<I> {
  total: number | null;
  pages: number;
  inPage: number;
  itemsInPage: number;
  itemsPerPage: number | null;
  items: I[];
}

export enum TenraiAnimeType {
  TV = "tv",
  Movie = "movie",
  OVA = "ova",
  Special = "special",
  ONA = "ona",
  Music = "music",
  CM = "cm",
  PV = "pv",
  TVSpecial = "tv_special",
}

export enum TenraiAnimeStatus {
  Airing = "airing",
  Complete = "complete",
  Upcoming = "upcoming",
}

export enum TenraiAnimeRatings {
  G = "g",
  PG = "pg",
  PG13 = "pg13",
  R17 = "r17",
  R = "r",
  RX = "rx",
}

export enum TenraiAnimeOrderBy {
  Title = "title",
  StartDate = "start_date",
  EndDate = "end_date",
  Score = "score",
  Type = "type",
}

export enum TenraiAnimeFilter {
  Airing = "airing",
  Upcoming = "upcoming",
  ByPopularity = "bypopularity",
  Favorite = "favorite",
}

export enum TenraiSort {
  Desc = "desc",
  Asc = "asc",
}

export interface TenraiSearchAnimeOptions {
  page?: number;
  query?: string;
  type?: TenraiAnimeType;
  status?: TenraiAnimeStatus;
  rating?: TenraiAnimeRatings;
  genres?: string[];
  orderBy?: TenraiAnimeOrderBy;
  sort?: TenraiSort;
  letter?: string;
  year?: string;
}

export interface TenraiSearchAnime {
  malId: number;
  title: string;
  type: string;
  airedFrom: string | null;
  status: string | null;
  malReviewScore: number | null;
  imageUrl: string | null;
  genres: string[];
  isAdult: boolean;
}

export interface TenraiAnimeEpisodeOptions {
  malId: number;
  page?: number;
}

export interface TenraiTopAnimeOptions {
  page?: number;
  type?: TenraiAnimeType;
  filter: TenraiAnimeFilter;
  rating?: TenraiAnimeRatings;
}

export interface TenraiTopAnime {
  malId: number;
  title: string;
  type: string;
  airedFrom: string | null;
  status: string | null;
  imageUrl: string | null;
  genres: string[];
  isAdult: boolean;
}

export interface TenraiGenre {
  malId: number;
  name: string;
  count?: number;
}

export interface TenraiTitle {
  type: string;
  title: string;
}

export interface TenraiDateProp {
  from: string | null;
  to: string | null;
  prop: {
    from: { day: number | null; month: number | null; year: number | null };
    to: { day: number | null; month: number | null; year: number | null };
  };
  string: string | null;
}

export interface TenraiMalEntry {
  malId: number;
  type: string;
  name: string;
}

export interface TenraiRelation {
  relationType: string;
  entry: {
    malId: number;
    title: string;
    type: string;
  }[];
}

export interface TenraiVideo {
  embedUrl: string | null;
  youtubeId: string | null;
  url: string | null;
}

export interface TenraiAnimeDetails {
  malId: number;
  url: string;
  imageUrl: string | null;
  trailer: TenraiVideo;
  title: string;
  titles: TenraiTitle[];
  type: string | null;
  source: string | null;
  malReviewScore: number | null;
  numberOfEpisodes: number | null;
  status: string | null;
  aired: TenraiDateProp;
  duration: string | null;
  rating: string | null;
  rank: number | null;
  popularity: number;
  synopsis: string | null;
  background: string | null;
  season: string | null;
  year: number | null;
  broadcast: {
    day: string | null;
    time: string | null;
    timezone: string | null;
    string: string | null;
  };
  producers: TenraiMalEntry[];
  licensors: TenraiMalEntry[];
  studios: TenraiMalEntry[];
  genres: string[];
  explicitGenres: string[];
  themes: string[];
  demographics: string[];
  external: string[];
  characters: {
    malId: number;
    name: string;
    imageUrl: string | null;
    role: string;
    voiceActors: {
      malId: number;
      name: string;
      imageUrl: string | null;
      language: string;
    }[];
  }[];
  cast: {
    malId: number;
    name: string;
    imageUrl: string | null;
    positions: string[];
  }[];
  videos: {
    promo: {
      title: string;
      video: TenraiVideo;
    }[];
    musicVideos: {
      title: string;
      author: string;
      video: TenraiVideo;
    }[];
  };
}

export interface TenraiAnimeEpisode {
  malId: number;
  title: string;
  episodeNumber: string;
  imageUrl: string | null;
}

@Injectable()
export class TenraiService {
  private readonly logger = new Logger(TenraiService.name);

  private readonly TENRAI_API_URL = "https://api.tenrai.org/v1";

  constructor(
    private readonly httpService: HttpService,
    private readonly cacheService: CacheService,
  ) {}

  async searchAnimes({
    page = DEFAULT_PAGINATION_PAGE,
    query,
    rating,
    sort,
    orderBy,
    status,
    type,
    genres,
    letter,
    year,
  }: TenraiSearchAnimeOptions): Promise<TenraiPagination<TenraiSearchAnime>> {
    try {
      const searchAnimeOptions = {
        query,
        limit: DEFAULT_PAGINATION_ITEMS_PER_PAGE,
        page,
        rating,
        sort,
        status,
        orderBy,
        type,
        genres: genres ? genres.join(",") : undefined,
        letter,
        startDate: year ? `${year}-01-01` : undefined,
        endDate: year ? `${year}-12-31` : undefined,
      };

      const searchAnimeKey = CACHE_KEYS.TENRAI_SEARCH_ANIMES.prefix({ ...searchAnimeOptions });

      const cachedAnimes = await this.cacheService.get<TenraiPagination<TenraiSearchAnime>>(searchAnimeKey);

      if (cachedAnimes) {
        return cachedAnimes;
      }

      const animesResponse = await firstValueFrom(
        this.httpService.get(`${this.TENRAI_API_URL}/anime`, {
          params: {
            q: searchAnimeOptions.query,
            page: searchAnimeOptions.page,
            limit: searchAnimeOptions.limit,
            rating: searchAnimeOptions.rating,
            sort: searchAnimeOptions.sort,
            order_by: searchAnimeOptions.orderBy,
            status: searchAnimeOptions.status,
            type: searchAnimeOptions.type,
            genres: searchAnimeOptions.genres,
            letter: searchAnimeOptions.letter,
            start_date: searchAnimeOptions.startDate,
            end_date: searchAnimeOptions.endDate,
          },
        }),
      );

      const itemsData = animesResponse.data.data;
      const paginationData = animesResponse.data.pagination;

      const items: TenraiSearchAnime[] = itemsData.map((anime: any) => ({
        malId: anime.mal_id,
        title: anime.title,
        type: anime.type,
        rating: anime.rating,
        airedFrom: anime.aired.from,
        status: anime.status,
        malReviewScore: anime?.score ?? 0,
        synopsis: anime?.synopsis ?? null,
        imageUrl: anime.images?.jpg?.image_url ?? null,
        trailerUrl: anime.trailer?.embed_url ?? null,
        genres: anime.genres ? anime.genres.map((genre) => genre.name) : [],
        isAdult: anime.genres ? anime.genres.some((genre) => genre.mal_id === 12) : false,
      }));

      const animes: TenraiPagination<TenraiSearchAnime> = {
        total: paginationData.items.total,
        pages: paginationData.last_visible_page,
        inPage: searchAnimeOptions.page,
        itemsInPage: items.length,
        itemsPerPage: searchAnimeOptions.limit,
        items,
      };

      await this.cacheService.set<TenraiPagination<TenraiSearchAnime>>(
        searchAnimeKey,
        animes,
        CACHE_KEYS.TENRAI_SEARCH_ANIMES.expiration,
      );

      return animes;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
      }

      this.logger.error(`Failed to search animes from Tenrai API`, error);

      throw new AppException(ERROR_CODES.TENRAI_SERVICE_UNAVAILABLE);
    }
  }

  async getAnimeGenres(): Promise<TenraiGenre[]> {
    try {
      const cachedGenres = await this.cacheService.get<TenraiGenre[]>(CACHE_KEYS.TENRAI_ANIME_GENRES.prefix);

      if (cachedGenres) {
        return cachedGenres;
      }

      const genresResponse = await firstValueFrom(this.httpService.get(`${this.TENRAI_API_URL}/genres/anime`));

      const genresData = genresResponse.data.data;

      const genres = genresData.map((genre) => ({
        malId: genre.mal_id,
        name: genre.name,
        count: genre.count,
      })) as TenraiGenre[];

      await this.cacheService.set(
        CACHE_KEYS.TENRAI_ANIME_GENRES.prefix,
        genres,
        CACHE_KEYS.TENRAI_ANIME_GENRES.expiration,
      );

      return genres;
    } catch (error: any) {
      this.logger.error("Failed to fetch anime genres from Tenrai API", error);

      throw new AppException(ERROR_CODES.TENRAI_SERVICE_UNAVAILABLE);
    }
  }

  async topAnimes({ page = DEFAULT_PAGINATION_PAGE, filter, rating, type }: TenraiTopAnimeOptions) {
    try {
      const topAnimesOptions = {
        limit: DEFAULT_PAGINATION_ITEMS_PER_PAGE,
        page,
        filter,
        rating,
        type,
      };

      const topAnimesKey = CACHE_KEYS.TENRAI_TOP_ANIMES.prefix({ ...topAnimesOptions });

      const cachedTopAnimes = await this.cacheService.get<TenraiPagination<TenraiTopAnime>>(topAnimesKey);

      if (cachedTopAnimes) {
        return cachedTopAnimes;
      }

      const topResponse = await firstValueFrom(
        this.httpService.get(`${this.TENRAI_API_URL}/top/anime`, {
          params: { ...topAnimesOptions },
        }),
      );

      const itemsData = topResponse.data.data;
      const paginationData = topResponse.data.pagination;

      const items = itemsData.map((anime) => ({
        malId: anime.mal_id,
        title: anime.title,
        type: anime.type,
        rating: anime.rating,
        airedFrom: anime.aired.from,
        status: anime.status,
        malReviewScore: anime?.score ?? 0,
        imageUrl: anime.images?.jpg?.image_url ?? null,
        trailerUrl: anime.trailer?.embed_url ?? null,
        synopsis: anime?.synopsis ?? null,
        genres: anime.genres ? anime.genres.map((genre) => genre.name) : [],
        isAdult: anime.genres ? anime.genres.some((genre) => genre.mal_id === 12) : false,
      }));

      const topAnimes: TenraiPagination<TenraiTopAnime> = {
        total: paginationData.items.total,
        pages: paginationData.last_visible_page,
        inPage: topAnimesOptions.page,
        itemsInPage: items.length,
        itemsPerPage: topAnimesOptions.limit,
        items,
      };

      await this.cacheService.set<TenraiPagination<TenraiTopAnime>>(
        topAnimesKey,
        topAnimes,
        CACHE_KEYS.TENRAI_TOP_ANIMES.expiration,
      );

      return topAnimes;
    } catch (error: any) {
      this.logger.error("Failed to fetch top animes from Tenrai API", error);

      throw new AppException(ERROR_CODES.TENRAI_SERVICE_UNAVAILABLE);
    }
  }

  async getAnimeById(id: number): Promise<TenraiAnimeDetails> {
    try {
      const cachedAnime = await this.cacheService.get<TenraiAnimeDetails>(CACHE_KEYS.TENRAI_ANIME_BY_ID.prefix(id));

      if (cachedAnime) {
        return cachedAnime;
      }

      const [animeFullResponse, charactersResponse, staffResponse, videosResponse] = await manyRequestWithDelay({
        httpService: this.httpService,
        urls: [
          `${this.TENRAI_API_URL}/anime/${id}/full`,
          `${this.TENRAI_API_URL}/anime/${id}/characters`,
          `${this.TENRAI_API_URL}/anime/${id}/staff`,
          `${this.TENRAI_API_URL}/anime/${id}/videos`,
        ],
      });

      const animeFullData = animeFullResponse.data.data;
      const videosData = videosResponse.data.data;
      const staffData = staffResponse.data.data;
      const charactersData = charactersResponse.data.data;

      const characters = charactersData.map((char) => ({
        malId: char.character.mal_id,
        name: char.character.name,
        imageUrl: char.character.images?.jpg?.image_url ?? null,
        role: char.role,
        voiceActors: char.voice_actors
          ? char.voice_actors.map((va) => ({
              malId: va.person.mal_id,
              name: va.person.name,
              imageUrl: va.person.images?.jpg?.image_url ?? null,
              language: va.language,
            }))
          : [],
      }));

      const cast = staffData.map((staff) => ({
        malId: staff.person.mal_id,
        name: staff.person.name,
        imageUrl: staff.person.images?.jpg?.image_url ?? null,
        positions: staff.positions,
      }));

      const videos = {
        promo: videosData.promo
          ? videosData.promo.map((promo) => ({
              title: promo.title,
              video: {
                embedUrl: promo.trailer.embed_url ?? null,
                youtubeId: promo.trailer.youtube_id ?? null,
                url: promo.trailer.url ?? null,
              },
            }))
          : [],
        musicVideos: videosData.music_videos
          ? videosData.music_videos.map((musicVideo) => ({
              title: musicVideo.meta.title,
              author: musicVideo.meta.author,
              video: {
                embedUrl: musicVideo.video.embed_url ?? null,
                youtubeId: musicVideo.video.youtube_id ?? null,
                url: musicVideo.video.url ?? null,
              },
            }))
          : [],
      };

      let numberOfEpisodes = animeFullData.episodes;

      if (numberOfEpisodes === null) {
        const episodesResponse = await firstValueFrom(
          this.httpService.get(`${this.TENRAI_API_URL}/anime/${id}/videos/episodes`, {
            params: { page: 1 },
          }),
        );

        numberOfEpisodes = episodesResponse?.data?.data?.[0]?.mal_id ?? null;
      }

      const anime = {
        malId: animeFullData.mal_id,
        url: animeFullData.url,
        imageUrl: animeFullData.images?.jpg?.image_url ?? null,
        trailer: {
          embedUrl: animeFullData.trailer?.embed_url ?? null,
          youtubeId: animeFullData.trailer?.youtube_id ?? null,
          url: animeFullData.trailer?.url ?? null,
        },
        title: animeFullData.title,
        titles: animeFullData.titles,
        type: animeFullData.type,
        source: animeFullData.source,
        numberOfEpisodes,
        status: animeFullData.status,
        aired: animeFullData.aired,
        duration: animeFullData.duration,
        rating: animeFullData.rating,
        rank: animeFullData.rank,
        isAdult: animeFullData.genres ? animeFullData.genres.some((genre) => genre.mal_id === 12) : false,
        popularity: animeFullData.popularity,
        synopsis: animeFullData.synopsis,
        background: animeFullData.background,
        season: animeFullData.season,
        year: animeFullData.year,
        broadcast: animeFullData.broadcast,
        producers: animeFullData.producers
          ? animeFullData.producers.map((producer) => ({
              malId: producer.mal_id,
              type: producer.type,
              name: producer.name,
            }))
          : [],
        licensors: animeFullData.licensors
          ? animeFullData.licensors.map((licensor) => ({
              malId: licensor.mal_id,
              type: licensor.type,
              name: licensor.name,
            }))
          : [],
        studios: animeFullData.studios
          ? animeFullData.studios.map((studio) => ({
              malId: studio.mal_id,
              type: studio.type,
              name: studio.name,
            }))
          : [],
        genres: animeFullData.genres ? animeFullData.genres.map((genre) => genre.name) : [],
        explicitGenres: animeFullData.explicit_genres ? animeFullData.explicit_genres.map((genre) => genre.name) : [],
        themes: animeFullData.themes ? animeFullData.themes.map((theme) => theme.name) : [],
        demographics: animeFullData.demographics ? animeFullData.demographics.map((demo) => demo.name) : [],
        external: animeFullData.external ? animeFullData.external : [],
        characters,
        cast,
        videos,
        malReviewScore: animeFullData?.score ?? 0,
      } as TenraiAnimeDetails;

      await this.cacheService.set(
        CACHE_KEYS.TENRAI_ANIME_BY_ID.prefix(id),
        anime,
        CACHE_KEYS.TENRAI_ANIME_BY_ID.expiration,
      );

      return anime;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
      }

      this.logger.error(`Failed to fetch anime details for ID ${id} from Tenrai API`, error);

      throw new AppException(ERROR_CODES.TENRAI_SERVICE_UNAVAILABLE);
    }
  }

  async getAnimeRelationsById(id: number) {
    try {
      const relationsResponse = await firstValueFrom(
        this.httpService.get(`${this.TENRAI_API_URL}/anime/${id}/relations`),
      );

      const relationsData = relationsResponse.data.data;

      const allEntries = relationsData.flatMap((relation) => relation.entry);

      const imageUrlMap = new Map<number, string | null>();

      if (allEntries.length > 0) {
        const urls = allEntries.map(
          (entry) => `${this.TENRAI_API_URL}/${entry.type === "anime" ? "anime" : "manga"}/${entry.mal_id}`,
        );

        const responses = await manyRequestWithDelay({
          httpService: this.httpService,
          urls,
          delayMs: 800,
        });

        for (let i = 0; i < allEntries.length; i++) {
          const entry = allEntries[i];
          const imageUrl = responses[i]?.data?.data?.images?.jpg?.image_url ?? null;

          imageUrlMap.set(entry.mal_id, imageUrl);
        }
      }

      const relations = relationsData.map((relation) => ({
        relationType: relation.relation,
        entry: relation.entry.map((entry) => ({
          malId: entry.mal_id,
          title: entry.name,
          type: entry.type,
          imageUrl: imageUrlMap.get(entry.mal_id) ?? null,
        })),
      }));

      return relations;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
      }

      this.logger.error(`Failed to fetch anime relations for ID ${id} from Tenrai API`, error);

      throw new AppException(ERROR_CODES.TENRAI_SERVICE_UNAVAILABLE);
    }
  }

  async getAnimeEpisodesById({
    malId,
    page = DEFAULT_PAGINATION_PAGE,
  }: TenraiAnimeEpisodeOptions): Promise<TenraiPagination<TenraiAnimeEpisode>> {
    try {
      const cacheKey = CACHE_KEYS.TENRAI_ANIME_EPISODES_BY_ID.prefix({ malId, page });
      const cached = await this.cacheService.get<TenraiPagination<TenraiAnimeEpisode>>(cacheKey);

      if (cached) {
        return cached;
      }

      const response = await firstValueFrom(
        this.httpService.get(`${this.TENRAI_API_URL}/anime/${malId}/episodes`, {
          params: { page },
        }),
      );

      const paginationData = response.data.pagination;

      const items: TenraiAnimeEpisode[] = (response.data.data ?? []).map((episode: any) => ({
        malId: episode.mal_id,
        title: episode.title,
        episodeNumber: String(episode.mal_id),
        imageUrl: episode.images?.jpg?.image_url ?? null,
      }));

      const result: TenraiPagination<TenraiAnimeEpisode> = {
        total: null,
        pages: paginationData.last_visible_page,
        inPage: page,
        itemsInPage: items.length,
        itemsPerPage: null,
        items,
      };

      await this.cacheService.set(cacheKey, result, CACHE_KEYS.TENRAI_ANIME_EPISODES_BY_ID.expiration);

      return result;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
      }

      this.logger.error(`Failed to fetch anime episodes for ID ${malId} from Tenrai API`, error);

      throw new AppException(ERROR_CODES.TENRAI_SERVICE_UNAVAILABLE);
    }
  }
}
