import { Module } from "@nestjs/common";

import { TVShowProgressController } from "./tv-show-progress.controller";
import { TVShowProgressService } from "./tv-show-progress.service";

@Module({
  imports: [],
  controllers: [TVShowProgressController],
  providers: [TVShowProgressService],
  exports: [TVShowProgressService],
})
export class TVShowProgressModule {}
