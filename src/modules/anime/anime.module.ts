import { Module } from "@nestjs/common";

import { AnimeEpisodeWatchController } from "./controller/anime-episode-watch.controller";
import { AnimeEpisodeWatchService } from "./service/anime-episode-watch.service";
import { AnimeProgressController } from "./controller/anime-progress.controller";
import { AnimeProgressService } from "./service/anime-progress.service";
import { AnimeReviewController } from "./controller/anime-review.controller";
import { AnimeReviewService } from "./service/anime-review.service";
import { AnimeController } from "./controller/anime.controller";
import { AnimeService } from "./service/anime.service";

@Module({
  controllers: [AnimeController, AnimeReviewController, AnimeProgressController, AnimeEpisodeWatchController],
  providers: [AnimeService, AnimeReviewService, AnimeProgressService, AnimeEpisodeWatchService],
  exports: [AnimeService, AnimeReviewService, AnimeProgressService, AnimeEpisodeWatchService],
})
export class AnimeModule {}
