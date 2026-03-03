import { Module } from "@nestjs/common";

import { AnimeProgressController } from "./anime-progress.controller";
import { AnimeProgressService } from "./anime-progress.service";

@Module({
  imports: [],
  controllers: [AnimeProgressController],
  providers: [AnimeProgressService],
  exports: [AnimeProgressService],
})
export class AnimeProgressModule {}
