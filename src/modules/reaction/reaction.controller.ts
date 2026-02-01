import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';

import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { ReactionService } from './reaction.service';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { GetCurrentUser, type UserWithProfile } from '@/shared/decorators/get-current-user.decorator';
import { AddReactionToCommentDto } from './dtos/add-reaction-to-comment.dto';

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
    @GetCurrentUser() user: UserWithProfile,
    @Body() body: AddReactionToCommentDto
  ) {
    await this.reactionService.addReactionToComment({
      ...body,
      userId: user.id
    });
  }
  
  @Get('/comment/:id')
  async getReactionsByCommentId(@Param('id') id: string) {
    const reactions = await this.reactionService.getReactionsByCommentId(id);
    
    return { reactions };
  }
}
