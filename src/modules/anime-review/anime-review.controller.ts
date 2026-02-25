import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { AnimeReviewService } from './anime-review.service';
import { CreateAnimeReviewDto } from './dtos/create-anime-review.dto';
import { GetAnimeReviewsDto } from './dtos/get-anime-reviews.dto';

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller("anime/review")
export class AnimeReviewController {
  constructor(private readonly animeReviewService: AnimeReviewService) { }
  
  @Post()
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.CREATED)
  async createAnimeReview(@Session() session: UserSession, @Body() body: CreateAnimeReviewDto) {
    await this.animeReviewService.createAnimeReview({
      ...body,
      userId: session.user.id,
    });
  }
  
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAnimeReviews(@Query() query: GetAnimeReviewsDto) {
    const animeReviews = await this.animeReviewService.getAnimeReviews(query);
    
    return { animeReviews }
  }
  
  @Get('/:animeReviewId')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async getAnimeReviewById(@Param('animeReviewId', new ParseUUIDPipe()) animeReviewId: string) {
    const animeReview = await this.animeReviewService.getAnimeReviewById(animeReviewId);
    
    return { animeReview };
  }
  
  @Patch('/:animeReviewId')
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async updateAnimeReview(
    @Param('animeReviewId', new ParseUUIDPipe()) animeReviewId: string,
    @Session() session: UserSession,
    @Body() body: CreateAnimeReviewDto,
  ) {
    await this.animeReviewService.updateAnimeReview({
      ...body,
      animeReviewId,
      userId: session.user.id,
    });
  }
  
  @Delete('/:animeReviewId')
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async deleteAnimeReview(
    @Param('animeReviewId', new ParseUUIDPipe()) animeReviewId: string,
    @Session() session: UserSession,
  ) {
    await this.animeReviewService.deleteAnimeReview({
      animeReviewId,
      userId: session.user.id,
    });
  }
}
