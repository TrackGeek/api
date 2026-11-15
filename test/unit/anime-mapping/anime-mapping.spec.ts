import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAnimeMappingIndex } from "@/modules/anime-mapping/service/anime-mapping-index";
import { AnimeMappingService, ANIME_MAPPING_REFRESH_MS, ANIME_MAPPING_URL } from "@/modules/anime-mapping/service/anime-mapping.service";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));

const entries = [
  { mal_id: 1225, themoviedb_id: { tv: 62913 }, season: { tmdb: 2 } },
  { mal_id: 300, themoviedb_id: { tv: 62913 }, season: { tmdb: 1 } },
  { mal_id: 164, themoviedb_id: { movie: [128, 129] } },
];

describe("Anime mapping index", () => {
  it("keeps movie and TV ID namespaces separate and indexes every movie ID", () => {
    const index = buildAnimeMappingIndex(entries);
    expect(index.get("movie:128")?.[0].malId).toBe(164);
    expect(index.get("movie:129")?.[0].malId).toBe(164);
    expect(index.get("tv:128")).toBeUndefined();
    expect(index.get("tv:62913")?.map((entry) => entry.malId)).toEqual([300, 1225]);
  });

  it("rejects malformed/empty snapshots and ignores missing or invalid canonical IDs", () => {
    expect(() => buildAnimeMappingIndex({})).toThrow();
    expect(() => buildAnimeMappingIndex([{ mal_id: null, themoviedb_id: { movie: [128] } }])).toThrow();
    expect(() => buildAnimeMappingIndex([])).toThrow();
  });

  it("preserves TMDB episode offsets and prioritizes first season over specials", () => {
    const index = buildAnimeMappingIndex([
      { mal_id: 1, themoviedb_id: { tv: 10 }, season: { tmdb: 0 }, episode_offset: { tmdb: 11 } },
      { mal_id: 9, themoviedb_id: { tv: 10 }, season: { tmdb: 1 } },
    ]);
    expect(index.get("tv:10")).toEqual([
      { malId: 9, season: 1, episodeOffset: 0 },
      { malId: 1, season: 0, episodeOffset: 11 },
    ]);
  });
});

describe("Anime mapping snapshots", () => {
  let directory: string;
  let file: string;
  let service: AnimeMappingService;

  beforeEach(async () => {
    vi.resetAllMocks();
    directory = await mkdtemp(join(tmpdir(), "trackgeek-anime-mapping-"));
    file = join(directory, "snapshot.json");
    service = new AnimeMappingService(new ConfigService({ ANIME_MAPPING_FILE: file }));
  });

  afterEach(async () => {
    service.onModuleDestroy();
    vi.useRealTimers();
    await rm(directory, { recursive: true, force: true });
  });

  it("downloads once, saves a server snapshot, and resolves canonical anime routes", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: entries });
    await Promise.all([service.initialize(), service.initialize()]);
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(ANIME_MAPPING_URL, expect.objectContaining({ timeout: 30000 }));
    expect(JSON.parse(await readFile(file, "utf8")).entries).toEqual(entries);
    expect(await service.resolve("movie", 128)).toEqual({ type: "anime", malId: 164, path: "/anime/164" });
    expect(await service.resolve("tv", 62913)).toMatchObject({ malId: 300 });
    expect(await service.resolve("movie", 999999)).toBeNull();
  });

  it("uses a fresh local snapshot without network then refreshes after seven days", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = Date.now();
    await writeFile(file, JSON.stringify({ downloadedAt: now, entries }));
    await service.initialize();
    expect(axios.get).not.toHaveBeenCalled();
    vi.setSystemTime(now + ANIME_MAPPING_REFRESH_MS - 1);
    expect(await service.refreshIfDue()).toBe(false);
    vi.setSystemTime(now + ANIME_MAPPING_REFRESH_MS);
    vi.mocked(axios.get).mockResolvedValue({ data: [{ mal_id: 900, themoviedb_id: { movie: [128] } }] });
    expect(await service.refreshIfDue()).toBe(true);
    expect(await service.resolve("movie", 128)).toMatchObject({ malId: 900 });
  });

  it("retries boundedly and preserves last good file and mapping on provider failure", async () => {
    const snapshot = JSON.stringify({ downloadedAt: 1, entries });
    await writeFile(file, snapshot);
    vi.mocked(axios.get).mockRejectedValue(new Error("upstream unavailable"));
    await service.initialize();
    expect(axios.get).toHaveBeenCalledTimes(3);
    expect(await service.resolve("movie", 128)).toMatchObject({ malId: 164 });
    expect(await readFile(file, "utf8")).toBe(snapshot);
  });

  it("rejects a corrupt upstream payload without replacing last good data", async () => {
    const snapshot = JSON.stringify({ downloadedAt: 1, entries });
    await writeFile(file, snapshot);
    vi.mocked(axios.get).mockResolvedValue({ data: { error: "rate limited" } });
    await service.initialize();
    expect(axios.get).toHaveBeenCalledTimes(3);
    expect(await service.resolve("tv", 62913)).toMatchObject({ malId: 300 });
    expect(await readFile(file, "utf8")).toBe(snapshot);
  });
});
