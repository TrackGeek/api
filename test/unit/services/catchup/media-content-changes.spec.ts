import { describe, expect, it } from "vitest";
import { hasMediaContentChanges } from "@/modules/catchup/utils/media-content-changes";

describe("Media content changes", () => {
  it("compares hydrated JSON dates and object keys without reporting false changes", () => {
    const stored = {
      firstAirDate: new Date("2025-09-23"),
      lastEpisodeToAir: { seasonNumber: 1, episodeNumber: 8, airDate: "2025-09-23T00:00:00.000Z" },
    };
    const incoming = {
      firstAirDate: new Date("2025-09-23"),
      lastEpisodeToAir: { airDate: new Date("2025-09-23"), episodeNumber: 8, seasonNumber: 1 },
    };

    expect(hasMediaContentChanges(stored, incoming)).toBe(false);
  });

  it("ignores volatile metrics while retaining content comparisons", () => {
    const stored = { rank: 1, popularity: 10, malReviewScore: 8, tmdbReviewScore: 8, title: "Beerus" };
    const incoming = { rank: 2, popularity: 11, malReviewScore: 8.1, tmdbReviewScore: 8.1, title: "Beerus" };

    expect(hasMediaContentChanges(stored, incoming)).toBe(false);
    expect(hasMediaContentChanges(stored, { ...incoming, title: "New title" })).toBe(true);
  });

  it("ignores fields absent from the response and treats missing optional fields as null", () => {
    expect(hasMediaContentChanges({ title: "Beerus", episodes: { "1": [] } }, { aired: null, title: undefined })).toBe(
      false,
    );
  });

  it.each([
    { stored: { status: "Not yet aired" }, incoming: { status: "Currently Airing" } },
    { stored: { numberOfEpisodes: 1 }, incoming: { numberOfEpisodes: 2 } },
    { stored: { nextEpisodeToAir: null }, incoming: { nextEpisodeToAir: { airDate: "2026-09-01" } } },
    { stored: { synopsis: "Old synopsis" }, incoming: { synopsis: "New synopsis" } },
    { stored: { genres: ["Action"] }, incoming: { genres: ["Action", "Comedy"] } },
    { stored: { imageUrl: "old.webp" }, incoming: { imageUrl: "new.webp" } },
    { stored: { synopsis: "Old synopsis" }, incoming: { synopsis: null } },
  ])("detects content changes in $incoming", ({ stored, incoming }) => {
    expect(hasMediaContentChanges(stored, incoming)).toBe(true);
  });
});
