import { Module } from "@nestjs/common";
import { BookController } from "./controller/book.controller";
import { BookProgressController } from "./controller/book-progress.controller";
import { BookReviewController } from "./controller/book-review.controller";
import { BookService } from "./service/book.service";
import { BookProgressService } from "./service/book-progress.service";
import { BookReviewService } from "./service/book-review.service";

@Module({
  imports: [],
  controllers: [BookController, BookReviewController, BookProgressController],
  providers: [BookService, BookReviewService, BookProgressService],
  exports: [BookService, BookReviewService, BookProgressService],
})
export class BookModule {}
