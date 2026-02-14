import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { ReactionService } from './reaction.service';
import { AddReactionToCommentDto } from './dtos/add-reaction-to-comment.dto';
import { AddReactionToFeedEventDto } from './dtos/add-reaction-to-feed-event.dto';

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller('reaction')
export class ReactionController {
  constructor(
    private readonly reactionService: ReactionService
  ) {}
    
  @Post('/comment')
  @UseGuards(AuthGuard)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.CREATED)
  async addReactionToComment(
    @Session() session: UserSession,
    @Body() body: AddReactionToCommentDto
  ) {
    await this.reactionService.addReactionToComment({
      ...body,
      userId: session.user.id
    });
  }
  
  @Post('/feed')
  @UseGuards(AuthGuard)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.CREATED)
  async addReactionToFeedEvent(
    @Session() session: UserSession,
    @Body() body: AddReactionToFeedEventDto
  ) {
    await this.reactionService.addReactionToFeedEvent({
      ...body,
      userId: session.user.id
    });
  }
  
  @Get('/comment/:id')
  async getReactionsByCommentId(@Param('id') id: string) {
    const reactions = await this.reactionService.getReactionsByCommentId(id);
    
    return { reactions };
  }
  
  @Get('/feed/:id')
  async getReactionsByFeedEventId(@Param('id') id: string) {
    const reactions = await this.reactionService.getReactionsByFeedEventId(id);
    
    return { reactions };
  }
}
