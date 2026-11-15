import { Injectable } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class ProtonDbService {
  getSteamAppId(websites: unknown): string | null {
    if (!Array.isArray(websites)) return null;
    for (const website of websites) {
      try {
        const url = new URL(website.url);
        if (url.hostname !== "store.steampowered.com") continue;
        const id = url.pathname.match(/^\/app\/([1-9]\d*)(?:\/|$)/)?.[1];
        if (id) return id;
      } catch {}
    }
    return null;
  }

  async getGameData(websites: unknown) {
    const steamAppId = this.getSteamAppId(websites);
    if (!steamAppId) {
      return {
        steamAppId: null,
        protonDbTier: null,
        protonDbScore: null,
        steamDeckCategory: null,
        protonDbUpdatedAt: new Date(),
      };
    }

    const [summary, deck] = await Promise.allSettled([
      axios.get<{ tier: string; score: number }>(
        `https://www.protondb.com/api/v1/reports/summaries/${steamAppId}.json`,
        { timeout: 10000 },
      ),
      axios.get<{ success: number; results?: { resolved_category?: number } }>(
        `https://www.protondb.com/proxy/steam/deck-verified?nAppID=${steamAppId}`,
        { timeout: 10000 },
      ),
    ]);
    const missingSummary =
      summary.status === "rejected" && axios.isAxiosError(summary.reason) && summary.reason.response?.status === 404;
    const category =
      deck.status === "fulfilled" && deck.value.data.success === 1
        ? (deck.value.data.results?.resolved_category ?? 0)
        : undefined;

    return {
      steamAppId,
      protonDbTier: summary.status === "fulfilled" ? summary.value.data.tier : missingSummary ? null : undefined,
      protonDbScore: summary.status === "fulfilled" ? summary.value.data.score : missingSummary ? null : undefined,
      steamDeckCategory: category,
      protonDbUpdatedAt: new Date(),
    };
  }
}
