import { Module } from "@nestjs/common";

import { MovieReviewController } from "./movie-review.controller";
import { MovieReviewService } from "./movie-review.service";

@Module({
  imports: [],
  controllers: [MovieReviewController],
  providers: [MovieReviewService],
  exports: [MovieReviewService],
})
export class MovieReviewModule {}
