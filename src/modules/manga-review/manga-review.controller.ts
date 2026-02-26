import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { MangaReviewService } from './manga-review.service';
import { CreateMangaReviewDto } from './dtos/create-manga-review.dto';
import { GetMangaReviewsDto } from './dtos/get-manga-reviews.dto';

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller("manga/review")
export class MangaReviewController {
  constructor(private readonly mangaReviewService: MangaReviewService) { }
  
  @Post()
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.CREATED)
  async createMangaReview(@Session() session: UserSession, @Body() body: CreateMangaReviewDto) {
    await this.mangaReviewService.createMangaReview({
      ...body,
      userId: session.user.id,
    });
  }
  
  @Get()
  @HttpCode(HttpStatus.OK)
  async getMangaReviews(@Query() query: GetMangaReviewsDto) {
    const mangaReviews = await this.mangaReviewService.getMangaReviews(query);
    
    return { mangaReviews }
  }
  
  @Get('/:mangaReviewId')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async getMangaReviewById(@Param('mangaReviewId', new ParseUUIDPipe()) mangaReviewId: string) {
    const mangaReview = await this.mangaReviewService.getMangaReviewById(mangaReviewId);
    
    return { mangaReview };
  }
  
  @Patch('/:mangaReviewId')
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async updateMangaReview(
    @Param('mangaReviewId', new ParseUUIDPipe()) mangaReviewId: string,
    @Session() session: UserSession,
    @Body() body: CreateMangaReviewDto,
  ) {
    await this.mangaReviewService.updateMangaReview({
      ...body,
      mangaReviewId,
      userId: session.user.id,
    });
  }
  
  @Delete('/:mangaReviewId')
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async deleteMangaReview(
    @Param('mangaReviewId', new ParseUUIDPipe()) mangaReviewId: string,
    @Session() session: UserSession,
  ) {
    await this.mangaReviewService.deleteMangaReview({
      mangaReviewId,
      userId: session.user.id,
    });
  }
}
