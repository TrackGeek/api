import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { manyRequestWithDelay } from "@/shared/utils/request";
import { CacheService } from "../cache/cache.service";
import { DEFAULT_PAGINATION_ITEMS_PER_PAGE, DEFAULT_PAGINATION_PAGE } from "../database/database.service";

export interface JikanPagination<I> {
  total: number | null;
  pages: number;
  inPage: number;
  itemsInPage: number;
  itemsPerPage: number | null;
  items: I[];
}

export enum JikanAnimeType {
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

export enum JikanMangaType {
  Manga = "manga",
  Novel = "novel",
  LightNovel = "lightnovel",
  OneShot = "oneshot",
  Doujin = "doujin",
  Manhwa = "manhwa",
  Manhua = "manhua",
}

export enum JikanAnimeStatus {
  Airing = "airing",
  Complete = "complete",
  Upcoming = "upcoming",
}

export enum JikanMangaStatus {
  Publishing = "publishing",
  Complete = "complete",
  Hiatus = "hiatus",
  Discontinued = "discontinued",
  Upcoming = "upcoming",
}

export enum JikanAnimeRatings {
  G = "g",
  PG = "pg",
  PG13 = "pg13",
  R17 = "r17",
  R = "r",
  RX = "rx",
}

export enum JikanAnimeOrderBy {
  Title = "title",
  StartDate = "start_date",
  EndDate = "end_date",
  Score = "score",
  Type = "type",
}

export enum JikanMangaOrderBy {
  Title = "title",
  StartDate = "start_date",
  EndDate = "end_date",
  Score = "score",
  Type = "type",
}

export enum JikanAnimeFilter {
  Airing = "airing",
  Upcoming = "upcoming",
  ByPopularity = "bypopularity",
  Favorite = "favorite",
}

export enum JikanMangaFilter {
  Publishing = "publishing",
  Upcoming = "upcoming",
  ByPopularity = "bypopularity",
  Favorite = "favorite",
}

export enum JikanSort {
  Desc = "desc",
  Asc = "asc",
}

export interface JikanSearchAnimeOptions {
  page?: number;
  query?: string;
  type?: JikanAnimeType;
  status?: JikanAnimeStatus;
  rating?: JikanAnimeRatings;
  genres?: string;
  orderBy?: JikanAnimeOrderBy;
  sort?: JikanSort;
  letter?: string;
  startDate?: string;
  endDate?: string;
}

export interface JikanSearchAnime {
  malId: number;
  title: string;
  type: string;
  airedFrom: string | null;
  status: string | null;
  malReviewScore: number | null;
  imageUrl: string | null;
  genres: string[];
}

export interface JikanSearchMangaOptions {
  page?: number;
  query?: string;
  type?: JikanMangaType;
  status?: JikanMangaStatus;
  genres?: string;
  orderBy?: JikanMangaOrderBy;
  sort?: JikanSort;
  letter?: string;
  startDate?: string;
  endDate?: string;
}

export interface JikanSearchManga {
  malId: number;
  title: string;
  type: string;
  publishedFrom: string | null;
  status: string | null;
  imageUrl: string | null;
  genres: string[];
}

export interface JikanAnimeEpisodeOptions {
  malId: number;
  page?: number;
}

export interface JikanTopAnimeOptions {
  page?: number;
  type?: JikanAnimeType;
  filter: JikanAnimeFilter;
  rating?: JikanAnimeRatings;
}

export interface JikanTopAnime {
  malId: number;
  title: string;
  type: string;
  airedFrom: string | null;
  status: string | null;
  imageUrl: string | null;
  genres: string[];
}

export interface JikanTopMangaOptions {
  page?: number;
  type?: JikanMangaType;
  filter: JikanMangaFilter;
}

export interface JikanTopManga {
  malId: number;
  title: string;
  type: string;
  publishedFrom: string | null;
  status: string | null;
  imageUrl: string | null;
  genres: string[];
}

export interface JikanGenre {
  malId: number;
  name: string;
  count?: number;
}

export interface JikanTitle {
  type: string;
  title: string;
}

export interface JikanDateProp {
  from: string | null;
  to: string | null;
  prop: {
    from: { day: number | null; month: number | null; year: number | null };
    to: { day: number | null; month: number | null; year: number | null };
  };
  string: string | null;
}

export interface JikanMalEntry {
  malId: number;
  type: string;
  name: string;
}

export interface JikanRelation {
  relationType: string;
  entry: {
    malId: number;
    title: string;
    type: string;
  }[];
}

export interface JikanVideo {
  embedUrl: string | null;
  youtubeId: string | null;
  url: string | null;
}

export interface JikanAnimeDetails {
  malId: number;
  url: string;
  imageUrl: string | null;
  trailer: JikanVideo;
  title: string;
  titles: JikanTitle[];
  type: string | null;
  source: string | null;
  numberOfEpisodes: number | null;
  status: string | null;
  aired: JikanDateProp;
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
  producers: JikanMalEntry[];
  licensors: JikanMalEntry[];
  studios: JikanMalEntry[];
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
      video: JikanVideo;
    }[];
    musicVideos: {
      title: string;
      author: string;
      video: JikanVideo;
    }[];
  };
}

export interface JikanAnimeEpisode {
  malId: number;
  title: string;
  episodeNumber: string;
  imageUrl: string | null;
}

export interface JikanMangaDetails {
  malId: number;
  url: string;
  imageUrl: string | null;
  title: string;
  titles: JikanTitle[];
  type: string | null;
  numberOfChapters: number | null;
  numberOfVolumes: number | null;
  status: string | null;
  published: JikanDateProp;
  rank: number | null;
  popularity: number;
  synopsis: string | null;
  authors: JikanMalEntry[];
  serializations: JikanMalEntry[];
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
  }[];
}

@Injectable()
export class JikanService {
  private readonly logger = new Logger(JikanService.name);

  private readonly JIKAN_API_URL = "https://api.jikan.moe/v4";

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
    startDate,
    endDate,
  }: JikanSearchAnimeOptions): Promise<JikanPagination<JikanSearchAnime>> {
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
        genres,
        letter,
        startDate,
        endDate,
      };

      const searchAnimeKey = CACHE_KEYS.JIKAN_SEARCH_ANIMES.prefix({ ...searchAnimeOptions });

      const cachedAnimes = await this.cacheService.get<JikanPagination<JikanSearchAnime>>(searchAnimeKey);

      if (cachedAnimes) {
        return cachedAnimes;
      }

      const animesResponse = await firstValueFrom(
        this.httpService.get(`${this.JIKAN_API_URL}/anime`, {
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

      const items: JikanSearchAnime[] = itemsData.map((anime: any) => ({
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

      const animes: JikanPagination<JikanSearchAnime> = {
        total: paginationData.items.total,
        pages: paginationData.last_visible_page,
        inPage: searchAnimeOptions.page,
        itemsPerPage: searchAnimeOptions.limit,
        itemsInPage: items.length,
        items,
      };

      await this.cacheService.set<JikanPagination<JikanSearchAnime>>(
        searchAnimeKey,
        animes,
        CACHE_KEYS.JIKAN_SEARCH_ANIMES.expiration,
      );

      return animes;
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
      }

      this.logger.error(`Failed to search animes from Jikan API`, error);

      throw new AppException(ERROR_CODES.JIKAN_SERVICE_UNAVAILABLE);
    }
  }

  async searchMangas({
    page = DEFAULT_PAGINATION_PAGE,
    query,
    sort,
    orderBy,
    status,
    type,
    genres,
    letter,
    startDate,
    endDate,
  }: JikanSearchMangaOptions): Promise<JikanPagination<JikanSearchManga>> {
    try {
      const searchMangaOptions = {
        query: query,
        limit: DEFAULT_PAGINATION_ITEMS_PER_PAGE,
        page,
        sort,
        status,
        orderBy,
        type,
        genres,
        letter,
        startDate,
        endDate,
      };

      const searchMangaKey = CACHE_KEYS.JIKAN_SEARCH_MANGAS.prefix({ ...searchMangaOptions });

      const cachedMangas = await this.cacheService.get<JikanPagination<JikanSearchManga>>(searchMangaKey);

      if (cachedMangas) {
        return cachedMangas;
      }

      const mangasResponse = await firstValueFrom(
        this.httpService.get(`${this.JIKAN_API_URL}/manga`, {
          params: {
            q: searchMangaOptions.query,
            limit: searchMangaOptions.limit,
            page: searchMangaOptions.page,
            sort: searchMangaOptions.sort,
            status: searchMangaOptions.status,
            order_by: searchMangaOptions.orderBy,
            type: searchMangaOptions.type,
            genres: searchMangaOptions.genres,
            letter: searchMangaOptions.letter,
            start_date: searchMangaOptions.startDate,
            end_date: searchMangaOptions.endDate,
          },
        }),
      );

      const itemsData = mangasResponse.data.data;
      const paginationData = mangasResponse.data.pagination;

      const items = itemsData.map((manga) => ({
        malId: manga.mal_id,
        title: manga.title,
        type: manga.type,
        rating: manga.rating,
        publishedFrom: manga.published.from,
        status: manga.status,
        malReviewScore: manga?.score ?? 0,
        synopsis: manga?.synopsis ?? null,
        imageUrl: manga.images?.jpg?.image_url ?? null,
        genres: manga.genres ? manga.genres.map((genre) => genre.name) : [],
        isAdult: manga.genres ? manga.genres.some((genre) => genre.mal_id === 12) : false,
      }));

      const mangas = {
        total: paginationData.items.total,
        pages: paginationData.last_visible_page,
        inPage: searchMangaOptions.page,
        itemsPerPage: searchMangaOptions.limit,
        itemsInPage: items.length,
        items,
      };

      await this.cacheService.set<JikanPagination<JikanSearchManga>>(
        searchMangaKey,
        mangas,
        CACHE_KEYS.JIKAN_SEARCH_MANGAS.expiration,
      );

      return mangas;
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.MANGA_NOT_FOUND);
      }

      this.logger.error(`Failed to search mangas from Jikan API`, error);

      throw new AppException(ERROR_CODES.JIKAN_SERVICE_UNAVAILABLE);
    }
  }

  async getAnimeGenres(): Promise<JikanGenre[]> {
    try {
      const cachedGenres = await this.cacheService.get<JikanGenre[]>(CACHE_KEYS.JIKAN_ANIME_GENRES.prefix);

      if (cachedGenres) {
        return cachedGenres;
      }

      const genresResponse = await firstValueFrom(this.httpService.get(`${this.JIKAN_API_URL}/genres/anime`));

      const genresData = genresResponse.data.data;

      const genres = genresData.map((genre) => ({
        malId: genre.mal_id,
        name: genre.name,
        count: genre.count,
      })) as JikanGenre[];

      await this.cacheService.set(
        CACHE_KEYS.JIKAN_ANIME_GENRES.prefix,
        genres,
        CACHE_KEYS.JIKAN_ANIME_GENRES.expiration,
      );

      return genres;
    } catch (error) {
      this.logger.error("Failed to fetch anime genres from Jikan API", error);

      throw new AppException(ERROR_CODES.JIKAN_SERVICE_UNAVAILABLE);
    }
  }

  async getMangaGenres() {
    try {
      const cachedGenres = await this.cacheService.get<JikanGenre[]>(CACHE_KEYS.JIKAN_MANGA_GENRES.prefix);

      if (cachedGenres) {
        return cachedGenres;
      }

      const genresResponse = await firstValueFrom(this.httpService.get(`${this.JIKAN_API_URL}/genres/manga`));

      const genresData = genresResponse.data.data;

      const genres = genresData.map((genre) => ({
        malId: genre.mal_id,
        name: genre.name,
        count: genre.count,
      })) as JikanGenre[];

      await this.cacheService.set(
        CACHE_KEYS.JIKAN_MANGA_GENRES.prefix,
        genres,
        CACHE_KEYS.JIKAN_MANGA_GENRES.expiration,
      );

      return genres;
    } catch (error) {
      this.logger.error("Failed to fetch manga genres from Jikan API", error);

      throw new AppException(ERROR_CODES.JIKAN_SERVICE_UNAVAILABLE);
    }
  }

  async topAnimes({ page = DEFAULT_PAGINATION_PAGE, filter, rating, type }: JikanTopAnimeOptions) {
    try {
      const topAnimesOptions = {
        limit: DEFAULT_PAGINATION_ITEMS_PER_PAGE,
        page,
        filter,
        rating,
        type,
      };

      const topAnimesKey = CACHE_KEYS.JIKAN_TOP_ANIMES.prefix({ ...topAnimesOptions });

      const cachedTopAnimes = await this.cacheService.get<JikanPagination<JikanTopAnime>>(topAnimesKey);

      if (cachedTopAnimes) {
        return cachedTopAnimes;
      }

      const topResponse = await firstValueFrom(
        this.httpService.get(`${this.JIKAN_API_URL}/top/anime`, {
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

      const topAnimes: JikanPagination<JikanTopAnime> = {
        total: paginationData.items.total,
        pages: paginationData.last_visible_page,
        inPage: topAnimesOptions.page,
        itemsPerPage: topAnimesOptions.limit,
        itemsInPage: items.length,
        items,
      };

      await this.cacheService.set<JikanPagination<JikanTopAnime>>(
        topAnimesKey,
        topAnimes,
        CACHE_KEYS.JIKAN_TOP_ANIMES.expiration,
      );

      return topAnimes;
    } catch (error) {
      this.logger.error("Failed to fetch top animes from Jikan API", error);

      throw new AppException(ERROR_CODES.JIKAN_SERVICE_UNAVAILABLE);
    }
  }

  async topMangas({ page = DEFAULT_PAGINATION_PAGE, filter, type }: JikanTopMangaOptions) {
    try {
      const topMangasOptions = {
        limit: DEFAULT_PAGINATION_ITEMS_PER_PAGE,
        page,
        filter,
        type,
      };

      const topMangasKey = CACHE_KEYS.JIKAN_TOP_MANGAS.prefix({ ...topMangasOptions });

      const cachedTopMangas = await this.cacheService.get<JikanPagination<JikanTopManga>>(topMangasKey);

      if (cachedTopMangas) {
        return cachedTopMangas;
      }

      const topResponse = await firstValueFrom(
        this.httpService.get(`${this.JIKAN_API_URL}/top/manga`, {
          params: { ...topMangasOptions },
        }),
      );

      const itemsData = topResponse.data.data;
      const paginationData = topResponse.data.pagination;

      const items = itemsData.map((manga) => ({
        malId: manga.mal_id,
        title: manga.title,
        type: manga.type,
        malReviewScore: manga?.score ?? 0,
        publishedFrom: manga.published.from,
        status: manga.status,
        synopsis: manga?.synopsis ?? null,
        imageUrl: manga.images?.jpg?.image_url ?? null,
        genres: manga.genres ? manga.genres.map((genre) => genre.name) : [],
        isAdult: manga.genres ? manga.genres.some((genre) => genre.mal_id === 12) : false,
      }));

      const topMangas: JikanPagination<JikanTopManga> = {
        total: paginationData.items.total,
        pages: paginationData.last_visible_page,
        inPage: topMangasOptions.page,
        itemsPerPage: topMangasOptions.limit,
        itemsInPage: items.length,
        items,
      };

      await this.cacheService.set<JikanPagination<JikanTopManga>>(
        topMangasKey,
        topMangas,
        CACHE_KEYS.JIKAN_TOP_MANGAS.expiration,
      );

      return topMangas;
    } catch (error) {
      this.logger.error("Failed to fetch top mangas from Jikan API", error);

      throw new AppException(ERROR_CODES.JIKAN_SERVICE_UNAVAILABLE);
    }
  }

  async getAnimeById(id: number): Promise<JikanAnimeDetails> {
    try {
      const cachedAnime = await this.cacheService.get<JikanAnimeDetails>(CACHE_KEYS.JIKAN_ANIME_BY_ID.prefix(id));

      if (cachedAnime) {
        return cachedAnime;
      }

      const [animeFullResponse, charactersResponse, staffResponse, videosResponse] = await manyRequestWithDelay({
        httpService: this.httpService,
        urls: [
          `${this.JIKAN_API_URL}/anime/${id}/full`,
          `${this.JIKAN_API_URL}/anime/${id}/characters`,
          `${this.JIKAN_API_URL}/anime/${id}/staff`,
          `${this.JIKAN_API_URL}/anime/${id}/videos`,
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
          this.httpService.get(`${this.JIKAN_API_URL}/anime/${id}/videos/episodes`, {
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
      } as JikanAnimeDetails;

      await this.cacheService.set(
        CACHE_KEYS.JIKAN_ANIME_BY_ID.prefix(id),
        anime,
        CACHE_KEYS.JIKAN_ANIME_BY_ID.expiration,
      );

      return anime;
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
      }

      this.logger.error(`Failed to fetch anime details for ID ${id} from Jikan API`, error);

      throw new AppException(ERROR_CODES.JIKAN_SERVICE_UNAVAILABLE);
    }
  }

  async getAnimeRelationsById(id: number) {
    try {
      const relationsResponse = await firstValueFrom(
        this.httpService.get(`${this.JIKAN_API_URL}/anime/${id}/relations`),
      );

      const relationsData = relationsResponse.data.data;

      const allEntries = relationsData.flatMap((relation) => relation.entry);

      const imageUrlMap = new Map<number, string | null>();

      if (allEntries.length > 0) {
        const urls = allEntries.map(
          (entry) => `${this.JIKAN_API_URL}/${entry.type === "anime" ? "anime" : "manga"}/${entry.mal_id}`,
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
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
      }

      this.logger.error(`Failed to fetch anime relations for ID ${id} from Jikan API`, error);

      throw new AppException(ERROR_CODES.JIKAN_SERVICE_UNAVAILABLE);
    }
  }

  async getAnimeEpisodesById({
    malId,
    page = DEFAULT_PAGINATION_PAGE,
  }: JikanAnimeEpisodeOptions): Promise<JikanPagination<JikanAnimeEpisode>> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.JIKAN_API_URL}/anime/${malId}/videos/episodes`, {
          params: { page },
        }),
      );

      const paginationData = response.data.pagination;

      const items: JikanAnimeEpisode[] = (response.data.data ?? []).map((video: any) => ({
        malId: video.mal_id,
        title: video.title,
        episodeNumber: video.episode,
        imageUrl: video.images?.jpg?.image_url ?? null,
      }));

      return {
        total: null,
        pages: paginationData.last_visible_page,
        inPage: page,
        itemsInPage: items.length,
        itemsPerPage: null,
        items,
      };
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
      }

      this.logger.error(`Failed to fetch anime episodes for ID ${malId} from Jikan API`, error);

      throw new AppException(ERROR_CODES.JIKAN_SERVICE_UNAVAILABLE);
    }
  }

  async getMangaById(id: number): Promise<JikanMangaDetails> {
    try {
      const cachedManga = await this.cacheService.get<JikanMangaDetails>(CACHE_KEYS.JIKAN_MANGA_BY_ID.prefix(id));

      if (cachedManga) {
        return cachedManga;
      }

      const [mangaFullResponse, charactersResponse] = await manyRequestWithDelay({
        httpService: this.httpService,
        urls: [`${this.JIKAN_API_URL}/manga/${id}/full`, `${this.JIKAN_API_URL}/manga/${id}/characters`],
      });

      const mangaFullData = mangaFullResponse.data.data;
      const charactersData = charactersResponse.data.data;

      const characters = charactersData.map((char) => ({
        malId: char.character.mal_id,
        name: char.character.name,
        imageUrl: char.character.images?.jpg?.image_url ?? null,
        role: char.role,
      }));

      const manga = {
        malId: mangaFullData.mal_id,
        url: mangaFullData.url,
        imageUrl: mangaFullData.images?.jpg?.image_url ?? null,
        title: mangaFullData.title,
        titles: mangaFullData.titles,
        type: mangaFullData.type,
        numberOfChapters: mangaFullData.chapters,
        numberOfVolumes: mangaFullData.volumes,
        status: mangaFullData.status,
        published: mangaFullData.published,
        rank: mangaFullData.rank,
        popularity: mangaFullData.popularity,
        synopsis: mangaFullData.synopsis,
        isAdult: mangaFullData.genres ? mangaFullData.genres.some((genre) => genre.mal_id === 12) : false,
        authors: mangaFullData.authors
          ? mangaFullData.authors.map((author) => ({
              malId: author.mal_id,
              type: author.type,
              name: author.name,
            }))
          : [],
        serializations: mangaFullData.serializations
          ? mangaFullData.serializations.map((serialization) => ({
              malId: serialization.mal_id,
              type: serialization.type,
              name: serialization.name,
            }))
          : [],
        genres: mangaFullData.genres ? mangaFullData.genres.map((genre) => genre.name) : [],
        explicitGenres: mangaFullData.explicit_genres ? mangaFullData.explicit_genres.map((genre) => genre.name) : [],
        themes: mangaFullData.themes ? mangaFullData.themes.map((theme) => theme.name) : [],
        demographics: mangaFullData.demographics ? mangaFullData.demographics.map((demo) => demo.name) : [],
        external: mangaFullData.external ? mangaFullData.external : [],
        characters,
        malReviewScore: mangaFullData?.score ?? 0,
      } as JikanMangaDetails;

      await this.cacheService.set(
        CACHE_KEYS.JIKAN_MANGA_BY_ID.prefix(id),
        manga,
        CACHE_KEYS.JIKAN_MANGA_BY_ID.expiration,
      );

      return manga;
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.MANGA_NOT_FOUND);
      }

      this.logger.error(`Failed to fetch manga details for ID ${id} from Jikan API`, error);

      throw new AppException(ERROR_CODES.JIKAN_SERVICE_UNAVAILABLE);
    }
  }

  async getMangaRelationsById(id: number) {
    try {
      const relationsResponse = await firstValueFrom(
        this.httpService.get(`${this.JIKAN_API_URL}/manga/${id}/relations`),
      );

      const relationsData = relationsResponse.data.data;

      const allEntries = relationsData.flatMap((relation) => relation.entry);

      const imageUrlMap = new Map<number, string | null>();

      if (allEntries.length > 0) {
        const urls = allEntries.map(
          (entry) => `${this.JIKAN_API_URL}/${entry.type === "anime" ? "anime" : "manga"}/${entry.mal_id}`,
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
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
      }

      this.logger.error(`Failed to fetch anime relations for ID ${id} from Jikan API`, error);

      throw new AppException(ERROR_CODES.JIKAN_SERVICE_UNAVAILABLE);
    }
  }
}
