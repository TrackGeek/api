import { Module } from "@nestjs/common";

import { MovieProgressController } from "./controller/movie-progress.controller";
import { MovieProgressService } from "./service/movie-progress.service";
import { MovieReviewController } from "./controller/movie-review.controller";
import { MovieReviewService } from "./service/movie-review.service";
import { MovieController } from "./controller/movie.controller";
import { MovieService } from "./service/movie.service";

@Module({
  imports: [],
  controllers: [MovieController, MovieReviewController, MovieProgressController],
  providers: [MovieService, MovieReviewService, MovieProgressService],
  exports: [MovieService, MovieReviewService, MovieProgressService],
})
export class MovieModule {}
