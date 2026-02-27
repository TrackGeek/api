import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { BookReviewService } from './book-review.service';
import { CreateBookReviewDto } from './dtos/create-book-review.dto';
import { GetBookReviewsDto } from './dtos/get-book-reviews.dto';

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller("book/review")
export class BookReviewController {
  constructor(private readonly bookReviewService: BookReviewService) { }
  
  @Post()
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.CREATED)
  async createBookReview(@Session() session: UserSession, @Body() body: CreateBookReviewDto) {
    await this.bookReviewService.createBookReview({
      ...body,
      userId: session.user.id,
    });
  }
  
  @Get()
  @HttpCode(HttpStatus.OK)
  async getBookReviews(@Query() query: GetBookReviewsDto) {
    const bookReviews = await this.bookReviewService.getBookReviews(query);
    
    return { bookReviews }
  }
  
  @Get('/:bookReviewId')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async getBookReviewById(@Param('bookReviewId', new ParseUUIDPipe()) bookReviewId: string) {
    const bookReview = await this.bookReviewService.getBookReviewById(bookReviewId);
    
    return { bookReview };
  }
  
  @Patch('/:bookReviewId')
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async updateBookReview(
    @Param('bookReviewId', new ParseUUIDPipe()) bookReviewId: string,
    @Session() session: UserSession,
    @Body() body: CreateBookReviewDto,
  ) {
    await this.bookReviewService.updateBookReview({
      ...body,
      bookReviewId,
      userId: session.user.id,
    });
  }
  
  @Delete('/:bookReviewId')
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async deleteBookReview(
    @Param('bookReviewId', new ParseUUIDPipe()) bookReviewId: string,
    @Session() session: UserSession,
  ) {
    await this.bookReviewService.deleteBookReview({
      bookReviewId,
      userId: session.user.id,
    });
  }
}
