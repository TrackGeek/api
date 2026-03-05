import { Global, Module } from "@nestjs/common";

import { TVShowEpisodeWatchController } from "./tv-show-episode-watch.controller";
import { TVShowEpisodeWatchService } from "./tv-show-episode-watch.service";

@Global()
@Module({
  imports: [],
  controllers: [TVShowEpisodeWatchController],
  providers: [TVShowEpisodeWatchService],
  exports: [TVShowEpisodeWatchService],
})
export class TVShowEpisodeWatchModule {}
