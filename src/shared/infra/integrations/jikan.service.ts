import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { firstValueFrom, timer } from "rxjs";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { manyRequestWithDelay } from "@/shared/utils/request";
import { CacheKeys, CacheService } from "../cache/cache.service";
import { CACHE_KEYS } from "@/shared/constants/cache";

@Injectable()
export class JikanService {
  private readonly logger = new Logger(JikanService.name);

  private readonly JIKAN_API_URL = "https://api.jikan.moe/v4";

  constructor(
    private readonly httpService: HttpService,
    private readonly cacheService: CacheService,
  ) {}

  async searchAnimes(query: string) {
    try {
      const cachedAnimes = await this.cacheService.get(CACHE_KEYS.JIKAN_SEARCH_ANIMES.prefix(query));

      if (cachedAnimes) {
        return cachedAnimes;
      }

      const animesResponse = await firstValueFrom(
        this.httpService.get(`${this.JIKAN_API_URL}/anime`, {
          params: { q: query, limit: 10 },
        }),
      );

      const animesData = animesResponse.data.data;

      const animes = animesData.map((anime) => ({
        malId: anime.mal_id,
        title: anime.title,
        type: anime.type,
        airedFrom: anime.aired.from,
        imageUrl: anime.images?.jpg?.image_url ?? null,
      }));

      await this.cacheService.set(
        CACHE_KEYS.JIKAN_SEARCH_ANIMES.prefix(query),
        animes,
        CACHE_KEYS.JIKAN_SEARCH_ANIMES.expiration,
      );

      return animes;
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
      }

      throw new AppException(ERROR_CODES.JIKAN_SERVICE_UNAVAILABLE);
    }
  }

  async searchMangas(query: string) {
    try {
      const cachedMangas = await this.cacheService.get(CACHE_KEYS.JIKAN_SEARCH_MANGAS.prefix(query));

      if (cachedMangas) {
        return cachedMangas;
      }

      const mangasResponse = await firstValueFrom(
        this.httpService.get(`${this.JIKAN_API_URL}/manga`, {
          params: { q: query, limit: 10 },
        }),
      );

      const mangasData = mangasResponse.data.data;

      const mangas = mangasData.map((manga) => ({
        malId: manga.mal_id,
        title: manga.title,
        type: manga.type,
        publishedFrom: manga.published.from,
        imageUrl: manga.images?.jpg?.image_url ?? null,
      }));

      await this.cacheService.set(
        CACHE_KEYS.JIKAN_SEARCH_MANGAS.prefix(query),
        mangas,
        CACHE_KEYS.JIKAN_SEARCH_MANGAS.expiration,
      );

      return mangas;
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.MANGA_NOT_FOUND);
      }

      this.logger.error(`Failed to search mangas with query "${query}" from Jikan API`, error);

      throw new AppException(ERROR_CODES.JIKAN_SERVICE_UNAVAILABLE);
    }
  }

  async getAnimeById(id: number): Promise<any> {
    try {
      const cachedAnime = await this.cacheService.get(CACHE_KEYS.JIKAN_ANIME_BY_ID.prefix(id));

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

      const relations = animeFullData.relations
        ? animeFullData.relations.map((relation) => ({
            relationType: relation.relation,
            entry: relation.entry.map((entry) => ({
              malId: entry.mal_id,
              title: entry.title,
              type: entry.type,
            })),
          }))
        : [];

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
        numberOfEpisodes: animeFullData.episodes,
        status: animeFullData.status,
        aired: animeFullData.aired,
        duration: animeFullData.duration,
        rating: animeFullData.rating,
        rank: animeFullData.rank,
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
        external: animeFullData.external ? animeFullData.external.map((ext) => ext.name) : [],
        characters,
        cast,
        videos,
        relations,
      };

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

  async getAnimeEpisodesById(id: number): Promise<any> {
    try {
      const cachedEpisodes = await this.cacheService.get(CACHE_KEYS.JIKAN_ANIME_EPISODES_BY_ID.prefix(id));

      if (cachedEpisodes) {
        return cachedEpisodes;
      }

      const episodesData: any[] = [];

      let page = 1;
      let hasNextPage = true;

      while (hasNextPage) {
        const videosResponse = await firstValueFrom(
          this.httpService.get(`${this.JIKAN_API_URL}/anime/${id}/videos/episodes`, {
            params: { page },
          }),
        );

        episodesData.push(...videosResponse.data.data);

        hasNextPage = videosResponse.data.pagination.has_next_page;
        page++;

        if (hasNextPage) {
          await firstValueFrom(timer(500));
        }
      }

      const episodes =
        episodesData.length > 0
          ? episodesData.map((video) => ({
              malId: video.mal_id,
              title: video.title,
              episodeNumber: video.episode,
              imageUrl: video.images?.jpg?.image_url ?? null,
            }))
          : [];

      await this.cacheService.set(
        CACHE_KEYS.JIKAN_ANIME_EPISODES_BY_ID.prefix(id),
        episodes,
        CACHE_KEYS.JIKAN_ANIME_EPISODES_BY_ID.expiration,
      );

      return episodes;
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new AppException(ERROR_CODES.ANIME_NOT_FOUND);
      }

      this.logger.error(`Failed to fetch anime episodes for ID ${id} from Jikan API`, error);

      throw new AppException(ERROR_CODES.JIKAN_SERVICE_UNAVAILABLE);
    }
  }

  async getMangaById(id: number): Promise<any> {
    try {
      const cachedManga = await this.cacheService.get(CACHE_KEYS.JIKAN_MANGA_BY_ID.prefix(id));

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

      const relations = mangaFullData.relations
        ? mangaFullData.relations.map((relation) => ({
            relationType: relation.relation,
            entry: relation.entry.map((entry) => ({
              malId: entry.mal_id,
              title: entry.title,
              type: entry.type,
            })),
          }))
        : [];

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
        external: mangaFullData.external ? mangaFullData.external.map((ext) => ext.name) : [],
        characters,
        relations,
      };

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
}
