import { Module } from "@nestjs/common";
import { PersonModule } from "../person/person.module";
import { AnimeController } from "./controller/anime.controller";
import { AnimeEpisodeWatchController } from "./controller/anime-episode-watch.controller";
import { AnimeProgressController } from "./controller/anime-progress.controller";
import { AnimeReviewController } from "./controller/anime-review.controller";
import { AnimeService } from "./service/anime.service";
import { AnimeEpisodeWatchService } from "./service/anime-episode-watch.service";
import { AnimeProgressService } from "./service/anime-progress.service";
import { AnimeReviewService } from "./service/anime-review.service";

@Module({
  imports: [PersonModule],
  controllers: [AnimeController, AnimeReviewController, AnimeProgressController, AnimeEpisodeWatchController],
  providers: [AnimeService, AnimeReviewService, AnimeProgressService, AnimeEpisodeWatchService],
  exports: [AnimeService, AnimeReviewService, AnimeProgressService, AnimeEpisodeWatchService],
})
export class AnimeModule {}
