import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { BookReviewService } from "./book-review.service";
import { CreateBookReviewDto } from "./dtos/create-book-review.dto";
import { GetBookReviewsDto } from "./dtos/get-book-reviews.dto";
import { UpdateBookReviewDto } from "./dtos/update-book-review.dto";

@Controller("/book/review")
export class BookReviewController {
  constructor(private readonly bookReviewService: BookReviewService) {}

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createBookReview(@Session() session: UserSession, @Body() body: CreateBookReviewDto) {
    await this.bookReviewService.createBookReview({
      ...body,
      userId: session.user.id,
    });
  }

  @Get("/")
  async getBookReviews(@Query() query: GetBookReviewsDto) {
    const bookReviews = await this.bookReviewService.getBookReviews(query);

    return { bookReviews };
  }

  @Get("/:bookReviewId")
  async getBookReviewById(@Param("bookReviewId", new ParseUUIDPipe()) bookReviewId: string) {
    const bookReview = await this.bookReviewService.getBookReviewById(bookReviewId);

    return { bookReview };
  }

  @Patch("/:bookReviewId")
  @UseGuards(AuthGuard)
  async updateBookReview(
    @Param("bookReviewId", new ParseUUIDPipe()) bookReviewId: string,
    @Session() session: UserSession,
    @Body() body: UpdateBookReviewDto,
  ) {
    await this.bookReviewService.updateBookReview({
      ...body,
      bookReviewId,
      userId: session.user.id,
    });
  }

  @Delete("/:bookReviewId")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBookReview(
    @Param("bookReviewId", new ParseUUIDPipe()) bookReviewId: string,
    @Session() session: UserSession,
  ) {
    await this.bookReviewService.deleteBookReview({
      bookReviewId,
      userId: session.user.id,
    });
  }
}
