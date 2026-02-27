import { Module } from "@nestjs/common";

import { MangaReviewController } from "./manga-review.controller";
import { MangaReviewService } from "./manga-review.service";

@Module({
  imports: [],
  controllers: [MangaReviewController],
  providers: [MangaReviewService],
  exports: [MangaReviewService],
})
export class MangaReviewModule {}
