import { Module } from "@nestjs/common";
import { MovieController } from "./controller/movie.controller";
import { MovieProgressController } from "./controller/movie-progress.controller";
import { MovieReviewController } from "./controller/movie-review.controller";
import { MovieService } from "./service/movie.service";
import { MovieProgressService } from "./service/movie-progress.service";
import { MovieReviewService } from "./service/movie-review.service";

@Module({
  imports: [],
  controllers: [MovieController, MovieReviewController, MovieProgressController],
  providers: [MovieService, MovieReviewService, MovieProgressService],
  exports: [MovieService, MovieReviewService, MovieProgressService],
})
export class MovieModule {}
