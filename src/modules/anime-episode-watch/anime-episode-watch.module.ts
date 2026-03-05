import { Global, Module } from "@nestjs/common";

import { AnimeEpisodeWatchController } from "./anime-episode-watch.controller";
import { AnimeEpisodeWatchService } from "./anime-episode-watch.service";

@Global()
@Module({
  imports: [],
  controllers: [AnimeEpisodeWatchController],
  providers: [AnimeEpisodeWatchService],
  exports: [AnimeEpisodeWatchService],
})
export class AnimeEpisodeWatchModule {}
