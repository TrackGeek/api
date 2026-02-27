import { Module } from "@nestjs/common";

import { BookReviewController } from "./book-review.controller";
import { BookReviewService } from "./book-review.service";

@Module({
  imports: [],
  controllers: [BookReviewController],
  providers: [BookReviewService],
  exports: [BookReviewService],
})
export class BookReviewModule {}
