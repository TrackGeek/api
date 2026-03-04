import { Global, Module } from "@nestjs/common";

import { AnimeProgressController } from "./anime-progress.controller";
import { AnimeProgressService } from "./anime-progress.service";

@Global()
@Module({
  imports: [],
  controllers: [AnimeProgressController],
  providers: [AnimeProgressService],
  exports: [AnimeProgressService],
})
export class AnimeProgressModule {}
