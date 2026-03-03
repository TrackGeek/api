import { Module } from "@nestjs/common";

import { MovieProgressController } from "./movie-progress.controller";
import { MovieProgressService } from "./movie-progress.service";

@Module({
  imports: [],
  controllers: [MovieProgressController],
  providers: [MovieProgressService],
  exports: [MovieProgressService],
})
export class MovieProgressModule {}
