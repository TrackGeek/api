import { Module } from "@nestjs/common";

import { TVShowController } from "./tv-show.controller";
import { TVShowService } from "./tv-show.service";

@Module({
  imports: [],
  controllers: [TVShowController],
  providers: [TVShowService],
  exports: [TVShowService],
})
export class TVShowModule {}
