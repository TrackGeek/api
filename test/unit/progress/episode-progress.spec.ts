import { describe, expect, it } from "vitest";
import { animeEpisodeProgress, tvEpisodeProgress } from "@/shared/utils/episode-progress";

describe("episode progress", () => {
  it("fills gaps before advancing and ignores duplicate or out-of-range anime episodes", () => {
    expect(animeEpisodeProgress(4, [{ episode: 1 }, { episode: 3 }, { episode: 3 }, { episode: 5 }])).toEqual({
      current: 2,
      total: 4,
      next: { episode: 2 },
    });
  });

  it("stops at the known total", () => {
    expect(animeEpisodeProgress(2, [{ episode: 1 }, { episode: 2 }]).next).toBeNull();
  });

  it("allows anime progress when the total is unknown", () => {
    expect(animeEpisodeProgress(null, [{ episode: 1 }])).toEqual({ current: 1, total: null, next: { episode: 2 } });
  });

  it("advances across seasons in order, including specials consistently with detail progress", () => {
    expect(
      tvEpisodeProgress(
        [
          { seasonNumber: 2, numberOfEpisodes: 2 },
          { seasonNumber: 0, numberOfEpisodes: 1 },
          { seasonNumber: 1, numberOfEpisodes: 1 },
        ],
        [
          { season: 0, episode: 1 },
          { season: 1, episode: 1 },
          { season: 2, episode: 2 },
          { season: 3, episode: 1 },
        ],
        3,
      ),
    ).toEqual({ current: 3, total: 4, next: { season: 2, episode: 1 } });
  });

  it("does not invent a season when metadata is unavailable", () => {
    expect(tvEpisodeProgress([], [{ season: 1, episode: 1 }], 12)).toEqual({ current: 1, total: 12, next: null });
  });

  it("stops when all TV episodes are watched", () => {
    expect(
      tvEpisodeProgress([{ seasonNumber: 1, numberOfEpisodes: 1 }], [{ season: 1, episode: 1 }], 1).next,
    ).toBeNull();
  });
});
