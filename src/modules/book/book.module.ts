import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { BookController } from "./controller/book.controller";
import { BookCoverController } from "./controller/book-cover.controller";
import { BookProgressController } from "./controller/book-progress.controller";
import { BookReviewController } from "./controller/book-review.controller";
import { BookCoverInterceptor } from "./interceptor/book-cover.interceptor";
import { BookService } from "./service/book.service";
import { BookCoverService } from "./service/book-cover.service";
import { BookProgressService } from "./service/book-progress.service";
import { BookReviewService } from "./service/book-review.service";

@Module({
  imports: [],
  controllers: [BookCoverController, BookController, BookReviewController, BookProgressController],
  providers: [
    BookService,
    BookReviewService,
    BookProgressService,
    BookCoverService,
    { provide: APP_INTERCEPTOR, useClass: BookCoverInterceptor },
  ],
  exports: [BookService, BookReviewService, BookProgressService],
})
export class BookModule {}
