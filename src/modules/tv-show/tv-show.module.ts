import { Module } from "@nestjs/common";

import { PersonModule } from "../person/person.module";
import { TVShowController } from "./controller/tv-show.controller";
import { TVShowEpisodeWatchController } from "./controller/tv-show-episode-watch.controller";
import { TVShowProgressController } from "./controller/tv-show-progress.controller";
import { TVShowReviewController } from "./controller/tv-show-review.controller";
import { TVShowService } from "./service/tv-show.service";
import { TVShowEpisodeWatchService } from "./service/tv-show-episode-watch.service";
import { TVShowProgressService } from "./service/tv-show-progress.service";
import { TVShowReviewService } from "./service/tv-show-review.service";

@Module({
  imports: [PersonModule],
  controllers: [TVShowController, TVShowReviewController, TVShowProgressController, TVShowEpisodeWatchController],
  providers: [TVShowService, TVShowReviewService, TVShowProgressService, TVShowEpisodeWatchService],
  exports: [TVShowService, TVShowReviewService, TVShowProgressService, TVShowEpisodeWatchService],
})
export class TVShowModule {}
