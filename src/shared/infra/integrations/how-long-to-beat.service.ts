import { Injectable } from "@nestjs/common";
import axios from "axios";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { ProtonDbService } from "./protondb.service";

export interface HowLongToBeatData {
  hltbId: number;
  mainStory: number | null;
  mainStoryWithExtras: number | null;
  completionist: number | null;
}

@Injectable()
export class HowLongToBeatService {
  private readonly pending = new Map<string, Promise<HowLongToBeatData | null>>();

  constructor(
    private readonly cacheService: CacheService,
    private readonly protonDbService: ProtonDbService,
  ) {}

  async getGameData(websites: unknown): Promise<HowLongToBeatData | null> {
    const steamAppId = this.protonDbService.getSteamAppId(websites);
    if (!steamAppId) return null;
    const key = `how-long-to-beat:steam:${steamAppId}`;
    const cached = await this.cacheService.get<{ data: HowLongToBeatData | null }>(key).catch(() => null);
    if (cached) return cached.data;
    const pending = this.pending.get(steamAppId);
    if (pending) return pending;
    const request = this.load(steamAppId, key).finally(() => this.pending.delete(steamAppId));
    this.pending.set(steamAppId, request);
    return request;
  }

  private async load(steamAppId: string, key: string): Promise<HowLongToBeatData | null> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data } = await axios.get(`https://hltbapi.codepotatoes.de/steam/${steamAppId}`, { timeout: 5000 });
        if (
          data &&
          Number(data.steamAppId) === Number(steamAppId) &&
          Number.isInteger(data.hltbId) &&
          data.hltbId > 0
        ) {
          const hours = (value: unknown) =>
            typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
          const result: HowLongToBeatData = {
            hltbId: data.hltbId,
            mainStory: hours(data.mainStory),
            mainStoryWithExtras: hours(data.mainStoryWithExtras),
            completionist: hours(data.completionist),
          };
          if (result.mainStory !== null || result.mainStoryWithExtras !== null || result.completionist !== null) {
            await this.cacheService.set(key, { data: result }, 86400).catch(() => undefined);
            return result;
          }
        }
      } catch (error) {
        if (axios.isAxiosError(error) && [400, 401, 403, 429].includes(error.response?.status ?? 0)) break;
      }
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
    await this.cacheService.set(key, { data: null }, 60).catch(() => undefined);
    return null;
  }
}
