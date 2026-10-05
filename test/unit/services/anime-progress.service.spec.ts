import { ProgressStatus } from "@prisma/generated/enums";
import { describe, expect, it, vi } from "vitest";
import { AnimeProgressService } from "@/modules/anime/service/anime-progress.service";

describe("AnimeProgressService", () => {
  it.each([true, false])(
    "marks all episodes on completion only when markAllEpisodes is %s",
    async (markAllEpisodes) => {
      const database = { animeProgress: { upsert: vi.fn().mockResolvedValue({ id: "progress" }) } };
      const queue = { toActivityJob: vi.fn(), toXpJob: vi.fn() };
      const episodes = { watchAllAnimeEpisodes: vi.fn() };
      const release = { assertProgressStatusAllowed: vi.fn() };
      const service = new AnimeProgressService(
        database as any,
        queue as any,
        episodes as any,
        {} as any,
        release as any,
      );
      const body = { animeId: "anime", userId: "owner", status: ProgressStatus.Completed };
      if (markAllEpisodes) await service.createOrUpdateAnimeProgress(body);
      else await service.createOrUpdateAnimeProgress(body, { markAllEpisodes: false });
      expect(database.animeProgress.upsert).toHaveBeenCalled();
      expect(release.assertProgressStatusAllowed).toHaveBeenCalledWith("anime", "anime", ProgressStatus.Completed);
      expect(episodes.watchAllAnimeEpisodes).toHaveBeenCalledTimes(markAllEpisodes ? 1 : 0);
    },
  );
});
