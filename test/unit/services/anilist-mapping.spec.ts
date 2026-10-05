import { ProgressStatus } from "@prisma/generated/enums";
import { describe, expect, it } from "vitest";
import { mapAnilistDate, mapAnilistEntry, mapAnilistScore, mapAnilistStatus } from "@/modules/import/anilist-mapping";

const raw = {
  id: 100,
  mediaId: 10,
  status: "CURRENT",
  progress: 12,
  repeat: 0,
  media: { id: 10, idMal: 20, type: "ANIME" as const, title: { romaji: "Title" } },
};

describe("AniList mapping", () => {
  it.each([
    ["POINT_3", 1, 0.5],
    ["POINT_3", 2, 2.5],
    ["POINT_3", 3, 5],
    ["POINT_5", 5, 5],
    ["POINT_5", 3, 3],
    ["POINT_100", 30, 1.5],
    ["POINT_100", 87, 4.5],
    ["POINT_100", 100, 5],
    ["POINT_10_DECIMAL", 8.7, 4.5],
    ["POINT_10_DECIMAL", 8.4, 4],
    ["POINT_10", 7, 3.5],
    ["POINT_10", 10, 5],
  ])("converts %s score %s to 0–5 rating %s", (format, score, expected) => {
    expect(mapAnilistScore(score, format)).toBe(expected);
  });

  it("ignores unset and invalid ratings", () => {
    expect(mapAnilistScore(0, "POINT_3")).toBeUndefined();
    expect(mapAnilistScore(4, "POINT_3")).toBeUndefined();
    expect(mapAnilistScore(NaN, "POINT_100")).toBeUndefined();
    expect(mapAnilistScore(7, "UNKNOWN")).toBeUndefined();
  });

  it("maps all anime advanced scores using the same format as overall", () => {
    expect(
      mapAnilistEntry(
        { ...raw, score: 3, advancedScores: { Story: 1, Characters: 2, Visuals: 3, Audio: 2, Enjoyment: 3 } },
        "POINT_3",
      ),
    ).toMatchObject({
      state: "ready",
      entry: { review: { overall: 5, story: 0.5, characters: 2.5, animation: 5, sound: 2.5, enjoyment: 5 } },
    });
  });

  it("maps manga visuals to art and preserves other categories alongside original notes", () => {
    expect(
      mapAnilistEntry(
        {
          ...raw,
          media: { ...raw.media, type: "MANGA" },
          notes: "Original",
          score: 87,
          advancedScores: { Visuals: 87, Story: 30, Characters: 100 },
        },
        "POINT_100",
      ),
    ).toMatchObject({
      state: "ready",
      entry: {
        review: { overall: 4.5, art: 4.5 },
        notes: "Original\n\nAniList advanced scores (0–5):\nStory: 1.5\nCharacters: 5",
      },
    });
  });
  it("uses MAL for anime, keeps exact progress/repeat and imports only true custom lists", () => {
    expect(
      mapAnilistEntry({ ...raw, notes: "Notes", customLists: { Included: true, Excluded: false, Invalid: 1 } }),
    ).toMatchObject({
      state: "ready",
      entry: {
        externalId: 20,
        status: ProgressStatus.Watching,
        progress: 12,
        repeat: 0,
        notes: "Notes",
        lists: ["Included"],
      },
    });
  });

  it("uses AniList media ID for manga", () => {
    expect(mapAnilistEntry({ ...raw, media: { ...raw.media, type: "MANGA" } })).toMatchObject({
      state: "ready",
      entry: { externalId: 10, status: ProgressStatus.Reading },
    });
  });

  it("logs anime without MAL ID as skipped", () => {
    expect(mapAnilistEntry({ ...raw, media: { ...raw.media, idMal: null } })).toEqual({
      state: "skipped",
      mediaId: 10,
      name: "Title",
      reason: "missingMalId",
    });
  });

  it("uses entry status, ignores media release status", () => {
    expect(mapAnilistEntry({ ...raw, status: "DROPPED", media: { ...raw.media, status: "FINISHED" } })).toMatchObject({
      state: "ready",
      entry: { status: ProgressStatus.Dropped },
    });
  });

  it("maps repeat states by content type and accepts finished alias", () => {
    expect(mapAnilistStatus("REPEATING", "ANIME")).toBe(ProgressStatus.Rewatching);
    expect(mapAnilistStatus("REPEATING", "MANGA")).toBe(ProgressStatus.Rereading);
    expect(mapAnilistStatus("FINISHED", "ANIME")).toBe(ProgressStatus.Completed);
    expect(mapAnilistStatus("PLANNING", "MANGA")).toBe(ProgressStatus.Planning);
    expect(mapAnilistStatus("UNKNOWN", "ANIME")).toBeUndefined();
  });

  it("preserves complete dates, fills partial dates and rejects impossible dates", () => {
    expect(mapAnilistDate({ year: 2024, month: 2, day: 29 }).date?.toISOString()).toBe("2024-02-29T00:00:00.000Z");
    expect(mapAnilistDate({ year: 2024 })).toEqual({ date: new Date("2024-01-01T00:00:00.000Z"), partial: true });
    expect(mapAnilistDate({ year: 2023, month: 2, day: 29 }).date).toBeUndefined();
    expect(mapAnilistDate({ year: null, month: null, day: null }).date).toBeUndefined();
  });
});
