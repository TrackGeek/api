import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { TVShowReviewService } from './tv-show-review.service';
import { CreateTVShowReviewDto } from './dtos/create-tv-show-review.dto';
import { GetTVShowReviewsDto } from './dtos/get-tv-show-reviews.dto';

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller("tv/review")
export class TVShowReviewController {
  constructor(private readonly tvShowReviewService: TVShowReviewService) { }
  
  @Post()
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.CREATED)
  async createTVShowReview(@Session() session: UserSession, @Body() body: CreateTVShowReviewDto) {
    await this.tvShowReviewService.createTVShowReview({
      ...body,
      userId: session.user.id,
    });
  }
  
  @Get()
  @HttpCode(HttpStatus.OK)
  async getTVShowReviews(@Query() query: GetTVShowReviewsDto) {
    const tvShowReviews = await this.tvShowReviewService.getTVShowReviews(query);
    
    return { tvShowReviews }
  }
  
  @Get('/:tvShowReviewId')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async getTVShowReviewById(@Param('tvShowReviewId', new ParseUUIDPipe()) tvShowReviewId: string) {
    const tvShowReview = await this.tvShowReviewService.getTVShowReviewById(tvShowReviewId);
    
    return { tvShowReview };
  }
  
  @Patch('/:tvShowReviewId')
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async updateTVShowReview(
    @Param('tvShowReviewId', new ParseUUIDPipe()) tvShowReviewId: string,
    @Session() session: UserSession,
    @Body() body: CreateTVShowReviewDto,
  ) {
    await this.tvShowReviewService.updateTVShowReview({
      ...body,
      tvShowReviewId,
      userId: session.user.id,
    });
  }
  
  @Delete('/:tvShowReviewId')
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async deleteTVShowReview(
    @Param('tvShowReviewId', new ParseUUIDPipe()) tvShowReviewId: string,
    @Session() session: UserSession,
  ) {
    await this.tvShowReviewService.deleteTVShowReview({
      tvShowReviewId,
      userId: session.user.id,
    });
  }
}
