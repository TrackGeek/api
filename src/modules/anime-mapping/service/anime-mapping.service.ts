import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { buildAnimeMappingIndex, type AnimeMappingIndex, type TmdbMediaType } from "./anime-mapping-index";

export const ANIME_MAPPING_URL = "https://raw.githubusercontent.com/Fribb/anime-lists/refs/heads/master/anime-list-mini.json";
export const ANIME_MAPPING_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AnimeMappingService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AnimeMappingService.name);
  private index: AnimeMappingIndex = new Map();
  private downloadedAt = 0;
  private initialization?: Promise<void>;
  private refresh?: Promise<boolean>;
  private timer?: ReturnType<typeof setInterval>;
  private readonly file: string;

  constructor(config: ConfigService) {
    this.file = resolve(config.get<string>("ANIME_MAPPING_FILE") ?? ".data/anime-list-mini.json");
  }

  onApplicationBootstrap() {
    void this.initialize();
    this.timer = setInterval(() => void this.refreshIfDue(), 60 * 60 * 1000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  initialize(): Promise<void> {
    this.initialization ??= this.loadSnapshot();
    return this.initialization;
  }

  private async loadSnapshot() {
    try {
      const snapshot = JSON.parse(await readFile(this.file, "utf8"));
      const index = buildAnimeMappingIndex(snapshot.entries);
      if (!Number.isFinite(snapshot.downloadedAt)) throw new Error("Invalid snapshot timestamp");
      this.index = index;
      this.downloadedAt = snapshot.downloadedAt;
    } catch (error) {
      this.logger.warn(`Anime mapping snapshot unavailable: ${String(error)}`);
    }
    await this.refreshIfDue();
  }

  async refreshIfDue(): Promise<boolean> {
    if (this.index.size && Date.now() - this.downloadedAt < ANIME_MAPPING_REFRESH_MS) return false;
    if (this.refresh) return this.refresh;
    this.refresh = this.download().finally(() => { this.refresh = undefined; });
    return this.refresh;
  }

  private async download(): Promise<boolean> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data: entries } = await axios.get(ANIME_MAPPING_URL, { timeout: 30000, maxContentLength: 30 * 1024 * 1024 });
        const index = buildAnimeMappingIndex(entries);
        const downloadedAt = Date.now();
        await mkdir(dirname(this.file), { recursive: true });
        const temporary = `${this.file}.${process.pid}.tmp`;
        await writeFile(temporary, JSON.stringify({ downloadedAt, entries }), "utf8");
        await rename(temporary, this.file);
        this.index = index;
        this.downloadedAt = downloadedAt;
        return true;
      } catch (error) {
        this.logger.warn(`Anime mapping refresh attempt ${attempt + 1} failed: ${String(error)}`);
      }
    }
    return false;
  }

  async mappings(type: TmdbMediaType, tmdbId: number) {
    await this.initialize();
    return this.index.get(`${type}:${tmdbId}`) ?? [];
  }

  async resolve(type: TmdbMediaType, tmdbId: number) {
    const mapping = (await this.mappings(type, tmdbId))[0];
    return mapping ? { type: "anime" as const, malId: mapping.malId, path: `/anime/${mapping.malId}` } : null;
  }
}
