import { Module } from "@nestjs/common";

import { BookProgressController } from "./controller/book-progress.controller";
import { BookProgressService } from "./service/book-progress.service";
import { BookReviewController } from "./controller/book-review.controller";
import { BookReviewService } from "./service/book-review.service";
import { BookController } from "./controller/book.controller";
import { BookService } from "./service/book.service";

@Module({
  imports: [],
  controllers: [BookController, BookReviewController, BookProgressController],
  providers: [BookService, BookReviewService, BookProgressService],
  exports: [BookService, BookReviewService, BookProgressService],
})
export class BookModule {}
