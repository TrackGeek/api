import { Module } from "@nestjs/common";

import { AnimeReviewController } from "./anime-review.controller";
import { AnimeReviewService } from "./anime-review.service";

@Module({
  imports: [],
  controllers: [AnimeReviewController],
  providers: [AnimeReviewService],
  exports: [AnimeReviewService],
})
export class AnimeReviewModule {}
