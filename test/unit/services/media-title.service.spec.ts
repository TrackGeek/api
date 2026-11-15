import { beforeEach, describe, expect, it, vi } from "vitest";
import { MediaTitleService } from "@/shared/media-title/media-title.service";

const titles = [
  { type: "Default", title: "Original" },
  { type: "Romaji", title: "Romaji title" },
  { type: "English", title: "English title" },
  { type: "Japanese", title: "日本語" },
];
const database = { anime: { findMany: vi.fn() }, manga: { findMany: vi.fn() } };

describe("MediaTitleService", () => {
  let service: MediaTitleService;

  beforeEach(() => {
    vi.resetAllMocks();
    database.anime.findMany.mockResolvedValue([]);
    database.manga.findMany.mockResolvedValue([]);
    service = new MediaTitleService(database as any);
  });

  it.each([
    ["romaji", "Romaji title"],
    ["english", "English title"],
    ["native", "日本語"],
  ] as const)(
    "uses %s titles from search and detail responses without mutating cached data",
    async (language, expected) => {
      const data = { animes: { items: [{ malId: 1, title: "Original", imageUrl: null, titles }] } };
      const result = (await service.localize(data, language)) as typeof data;
      expect(result.animes.items[0].title).toBe(expected);
      expect(result.animes.items[0]).toHaveProperty("titleRomaji", "Romaji title");
      expect(data.animes.items[0].title).toBe("Original");
      expect(database.anime.findMany).not.toHaveBeenCalled();
    },
  );

  it("batches library titles and keeps overlapping anime and manga IDs separate", async () => {
    database.anime.findMany.mockResolvedValue([{ malId: 1, title: "Anime", titles }]);
    database.manga.findMany.mockResolvedValue([
      { anilistId: 1, malId: 1, title: "Manga", titles: [{ type: "Native", title: "漫画" }] },
    ]);
    const data = {
      items: [
        { anime: { malId: 1, title: "Anime", imageUrl: null } },
        { anime: { malId: 1, title: "Anime", imageUrl: null } },
        { manga: { anilistId: 1, malId: 1, title: "Manga", imageUrl: null } },
        { manga: { malId: 1, title: "Manga", imageUrl: null } },
      ],
    };
    const result = (await service.localize(data, "native")) as typeof data;
    expect(result.items[0].anime?.title).toBe("日本語");
    expect(result.items[2].manga?.title).toBe("漫画");
    expect(result.items[3].manga?.title).toBe("漫画");
    expect(database.anime.findMany).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ where: { malId: { in: [1] } } }),
    );
    expect(database.manga.findMany).toHaveBeenCalledTimes(1);
  });

  it("uses romaji by default for manga whose stored main title is English", async () => {
    database.manga.findMany.mockResolvedValue([{ anilistId: 1, malId: null, title: "English title", titles }]);
    const result = await service.localize(
      { manga: { anilistId: 1, title: "English title", imageUrl: null } },
      "romaji",
    );
    expect(result).toMatchObject({ manga: { title: "Romaji title" } });
  });

  it("falls back from missing or blank translations to romaji, then existing title", async () => {
    const data = [
      {
        anilistId: 1,
        title: "English",
        titles: [
          { type: "English", title: " " },
          { type: "Romaji", title: "Romanized" },
        ],
      },
      { malId: 2, title: "Canonical", imageUrl: null },
    ];
    expect(await service.localize(data, "english")).toMatchObject([{ title: "Romanized" }, { title: "Canonical" }]);
  });

  it("leaves other media, episodes, dates and alternative titles unchanged", async () => {
    const date = new Date();
    const data = {
      movie: { tmdbId: 1, title: "Movie", imageUrl: null },
      episode: { malId: 1, title: "Episode" },
      date,
      titles,
    };
    expect(await service.localize(data, "native")).toEqual(data);
    expect(database.anime.findMany).not.toHaveBeenCalled();
    expect(database.manga.findMany).not.toHaveBeenCalled();
  });
});
