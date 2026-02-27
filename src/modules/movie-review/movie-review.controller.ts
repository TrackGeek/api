import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { MovieReviewService } from './movie-review.service';
import { CreateMovieReviewDto } from './dtos/create-movie-review.dto';
import { GetMovieReviewsDto } from './dtos/get-movie-reviews.dto';

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller("movie/review")
export class MovieReviewController {
  constructor(private readonly movieReviewService: MovieReviewService) { }
  
  @Post()
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.CREATED)
  async createMovieReview(@Session() session: UserSession, @Body() body: CreateMovieReviewDto) {
    await this.movieReviewService.createMovieReview({
      ...body,
      userId: session.user.id,
    });
  }
  
  @Get()
  @HttpCode(HttpStatus.OK)
  async getMovieReviews(@Query() query: GetMovieReviewsDto) {
    const movieReviews = await this.movieReviewService.getMovieReviews(query);
    
    return { movieReviews }
  }
  
  @Get('/:movieReviewId')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async getMovieReviewById(@Param('movieReviewId', new ParseUUIDPipe()) movieReviewId: string) {
    const movieReview = await this.movieReviewService.getMovieReviewById(movieReviewId);
    
    return { movieReview };
  }
  
  @Patch('/:movieReviewId')
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async updateMovieReview(
    @Param('movieReviewId', new ParseUUIDPipe()) movieReviewId: string,
    @Session() session: UserSession,
    @Body() body: CreateMovieReviewDto,
  ) {
    await this.movieReviewService.updateMovieReview({
      ...body,
      movieReviewId,
      userId: session.user.id,
    });
  }
  
  @Delete('/:movieReviewId')
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async deleteMovieReview(
    @Param('movieReviewId', new ParseUUIDPipe()) movieReviewId: string,
    @Session() session: UserSession,
  ) {
    await this.movieReviewService.deleteMovieReview({
      movieReviewId,
      userId: session.user.id,
    });
  }
}
