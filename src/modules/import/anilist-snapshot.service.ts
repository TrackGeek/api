import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { isAxiosError } from "axios";
import { firstValueFrom } from "rxjs";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { ANILIST_COLLECTION_QUERY, ANILIST_USER_QUERY } from "./anilist-snapshot.query";

type MediaType = "ANIME" | "MANGA";

export interface AnilistEntry extends Record<string, unknown> {
  id: number;
  mediaId: number;
  media: { id: number; type: MediaType } & Record<string, unknown>;
}

interface AnilistGroup extends Record<string, unknown> {
  entries: AnilistEntry[];
}

export interface AnilistCollection {
  hasNextChunk: boolean;
  lists: AnilistGroup[];
}

export interface AnilistUser extends Record<string, unknown> {
  id: number;
  name: string;
  mediaListOptions: { scoreFormat: string | null } | null;
}

interface GraphqlResponse<T> {
  data?: T;
  errors?: { message: string; status?: number }[];
}

@Injectable()
export class AnilistSnapshotService {
  constructor(private readonly http: HttpService) {}

  async collect(username: string) {
    const { User: user } = await this.request<{ User: AnilistUser | null }>(ANILIST_USER_QUERY, { name: username });

    if (!user) throw new AppException(ERROR_CODES.ANILIST_USER_NOT_FOUND);

    const scoreFormat = user.mediaListOptions?.scoreFormat ?? "POINT_100";
    const anime = await this.collectType(user.id, "ANIME", scoreFormat);
    const manga = await this.collectType(user.id, "MANGA", scoreFormat);

    return {
      schemaVersion: 1,
      source: "anilist",
      exportedAt: new Date().toISOString(),
      access: "public",
      imported: false,
      scoreFormat,
      user,
      counts: {
        anime: anime.entries.length,
        manga: manga.entries.length,
        total: anime.entries.length + manga.entries.length,
      },
      entries: [...anime.entries, ...manga.entries],
      collections: { anime: anime.chunks, manga: manga.chunks },
    };
  }

  private async collectType(userId: number, type: MediaType, scoreFormat: string) {
    const chunks: AnilistCollection[] = [];
    const entries = new Map<number, AnilistEntry & { listEntryId: number; type: MediaType }>();
    let hasNextChunk = true;

    for (let chunk = 1; hasNextChunk; chunk++) {
      const { MediaListCollection: collection } = await this.request<{
        MediaListCollection: AnilistCollection | null;
      }>(ANILIST_COLLECTION_QUERY, { userId, type, chunk, scoreFormat });

      if (!collection || !Array.isArray(collection.lists) || typeof collection.hasNextChunk !== "boolean") {
        throw new AppException(ERROR_CODES.ANILIST_SERVICE_UNAVAILABLE);
      }

      chunks.push(collection);

      for (const group of collection.lists) {
        if (!Array.isArray(group.entries)) throw new AppException(ERROR_CODES.ANILIST_SERVICE_UNAVAILABLE);

        for (const entry of group.entries) {
          if (!entry || !Number.isInteger(entry.mediaId) || !Number.isInteger(entry.id)) {
            throw new AppException(ERROR_CODES.ANILIST_SERVICE_UNAVAILABLE);
          }

          if (!entries.has(entry.mediaId)) entries.set(entry.mediaId, { ...entry, listEntryId: entry.id, type });
        }
      }

      hasNextChunk = collection.hasNextChunk;
    }

    return { chunks, entries: [...entries.values()] };
  }

  private async request<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.http.post<GraphqlResponse<T>>(
          "https://graphql.anilist.co",
          { query, variables },
          { timeout: 30_000, headers: { Accept: "application/json" } },
        ),
      );

      if (response.data.errors?.length) this.fail(response.data.errors[0].status);
      if (!response.data.data) this.fail();

      return response.data.data as T;
    } catch (error) {
      if (error instanceof AppException) throw error;
      this.fail(isAxiosError(error) ? error.response?.status : undefined);
    }
  }

  private fail(status?: number): never {
    if (status === 404) throw new AppException(ERROR_CODES.ANILIST_USER_NOT_FOUND);
    if (status === 403) throw new AppException(ERROR_CODES.ANILIST_PRIVATE_LIBRARY);
    if (status === 429) throw new AppException(ERROR_CODES.RATE_LIMIT_EXCEEDED);
    throw new AppException(ERROR_CODES.ANILIST_SERVICE_UNAVAILABLE);
  }
}
