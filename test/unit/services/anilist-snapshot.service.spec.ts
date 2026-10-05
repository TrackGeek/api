import type { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANILIST_COLLECTION_QUERY, ANILIST_USER_QUERY } from "@/modules/import/anilist-snapshot.query";
import { AnilistSnapshotService } from "@/modules/import/anilist-snapshot.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";

const user = { id: 42, name: "Kuriel", mediaListOptions: { scoreFormat: "POINT_10_DECIMAL" } };
const response = (data: unknown) => of({ data: { data } });
const entry = (mediaId: number, type = "ANIME") => ({
  id: mediaId + 100,
  mediaId,
  status: "CURRENT",
  score: 8.5,
  scoreRaw: 85,
  progress: 12,
  progressVolumes: 2,
  repeat: 3,
  priority: 1,
  private: false,
  notes: "Keep original notes",
  hiddenFromStatusLists: true,
  customLists: { Favorites: true },
  advancedScores: { Story: 9 },
  startedAt: { year: 2020, month: null, day: null },
  completedAt: { year: null, month: null, day: null },
  createdAt: 123,
  updatedAt: 456,
  media: { id: mediaId, idMal: 999, type, title: { native: "原題" }, synonyms: ["Alt"] },
});
const collection = (entries: unknown[], hasNextChunk = false, name = "Favorites", isCustomList = true) =>
  response({ MediaListCollection: { hasNextChunk, lists: [{ name, isCustomList, entries }] } });

describe("AnilistSnapshotService", () => {
  const post = vi.fn();
  const service = new AnilistSnapshotService({ post } as unknown as HttpService);

  beforeEach(() => post.mockReset());

  it("keeps custom-only entries, deduplicates all chunks, preserves raw data and score format", async () => {
    post.mockReturnValueOnce(response({ User: user }));
    post.mockReturnValueOnce(collection([entry(1)], true));
    post.mockReturnValueOnce(collection([entry(1), entry(2)], false, "Watching", false));
    post.mockReturnValueOnce(collection([entry(3, "MANGA")]));

    const snapshot = await service.collect("Kuriel");

    expect(snapshot).toMatchObject({
      source: "anilist",
      access: "public",
      imported: false,
      user,
      scoreFormat: "POINT_10_DECIMAL",
      counts: { anime: 2, manga: 1, total: 3 },
    });
    expect(snapshot.entries[0]).toEqual({ ...entry(1), listEntryId: 101, type: "ANIME" });
    expect(snapshot.collections.anime).toHaveLength(2);
    expect(snapshot.collections.anime[0].lists[0]).toMatchObject({ isCustomList: true, entries: [entry(1)] });
    expect(post.mock.calls.map((call) => call[1])).toEqual([
      { query: ANILIST_USER_QUERY, variables: { name: "Kuriel" } },
      {
        query: ANILIST_COLLECTION_QUERY,
        variables: { userId: 42, type: "ANIME", chunk: 1, scoreFormat: "POINT_10_DECIMAL" },
      },
      {
        query: ANILIST_COLLECTION_QUERY,
        variables: { userId: 42, type: "ANIME", chunk: 2, scoreFormat: "POINT_10_DECIMAL" },
      },
      {
        query: ANILIST_COLLECTION_QUERY,
        variables: { userId: 42, type: "MANGA", chunk: 1, scoreFormat: "POINT_10_DECIMAL" },
      },
    ]);
  });

  it("stops before collecting lists when user does not exist", async () => {
    post.mockReturnValueOnce(response({ User: null }));
    await expect(service.collect("missing")).rejects.toEqual(new AppException(ERROR_CODES.ANILIST_USER_NOT_FOUND));
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("accepts empty public libraries", async () => {
    post.mockReturnValueOnce(response({ User: user }));
    post.mockReturnValue(collection([]));
    expect((await service.collect("Kuriel")).counts).toEqual({ anime: 0, manga: 0, total: 0 });
  });

  it("rejects partial GraphQL results instead of exporting incomplete data", async () => {
    post.mockReturnValueOnce(response({ User: user }));
    post.mockReturnValueOnce(of({ data: { data: { MediaListCollection: { lists: [] } }, errors: [{ status: 503 }] } }));
    await expect(service.collect("Kuriel")).rejects.toEqual(new AppException(ERROR_CODES.ANILIST_SERVICE_UNAVAILABLE));
    expect(post).toHaveBeenCalledTimes(2);
  });

  it.each([null, { lists: [] }, { hasNextChunk: false, lists: [{ entries: null }] }])(
    "rejects malformed collection %j",
    async (invalidCollection) => {
      post.mockReturnValueOnce(response({ User: user }));
      post.mockReturnValueOnce(response({ MediaListCollection: invalidCollection }));
      await expect(service.collect("Kuriel")).rejects.toEqual(
        new AppException(ERROR_CODES.ANILIST_SERVICE_UNAVAILABLE),
      );
    },
  );

  it.each([
    [404, ERROR_CODES.ANILIST_USER_NOT_FOUND],
    [403, ERROR_CODES.ANILIST_PRIVATE_LIBRARY],
    [429, ERROR_CODES.RATE_LIMIT_EXCEEDED],
    [500, ERROR_CODES.ANILIST_SERVICE_UNAVAILABLE],
  ])("maps upstream HTTP %i without retrying", async (status, code) => {
    post.mockReturnValueOnce(throwError(() => ({ isAxiosError: true, response: { status } })));
    await expect(service.collect("Kuriel")).rejects.toEqual(new AppException(code));
    expect(post).toHaveBeenCalledTimes(1);
  });
});
