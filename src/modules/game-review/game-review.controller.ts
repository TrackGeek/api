import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { GameReviewService } from './game-review.service';
import { CreateGameReviewDto } from './dtos/create-game-review.dto';
import { GetGameReviewsDto } from './dtos/get-game-reviews.dto';

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller("game/review")
export class GameReviewController {
  constructor(private readonly gameReviewService: GameReviewService) { }
  
  @Post()
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.CREATED)
  async createGameReview(@Session() session: UserSession, @Body() body: CreateGameReviewDto) {
    await this.gameReviewService.createGameReview({
      ...body,
      userId: session.user.id,
    });
  }
  
  @Get()
  @HttpCode(HttpStatus.OK)
  async getGameReviews(@Query() query: GetGameReviewsDto) {
    const gameReviews = await this.gameReviewService.getGameReviews(query);
    
    return { gameReviews }
  }
  
  @Get('/:gameReviewId')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async getGameReviewById(@Param('gameReviewId', new ParseUUIDPipe()) gameReviewId: string) {
    const gameReview = await this.gameReviewService.getGameReviewById(gameReviewId);
    
    return { gameReview };
  }
  
  @Patch('/:gameReviewId')
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async updateGameReview(
    @Param('gameReviewId', new ParseUUIDPipe()) gameReviewId: string,
    @Session() session: UserSession,
    @Body() body: CreateGameReviewDto,
  ) {
    await this.gameReviewService.updateGameReview({
      ...body,
      gameReviewId,
      userId: session.user.id,
    });
  }
  
  @Delete('/:gameReviewId')
  @UseGuards(RateLimitGuard)
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async deleteGameReview(
    @Param('gameReviewId', new ParseUUIDPipe()) gameReviewId: string,
    @Session() session: UserSession,
  ) {
    await this.gameReviewService.deleteGameReview({
      gameReviewId,
      userId: session.user.id,
    });
  }
}
