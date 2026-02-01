import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';

import { CommentService } from './comment.service';
import { AddCommentToProfileDto } from './dtos/add-comment-to-profile.dto';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { AddCommentToGameDto } from './dtos/add-comment-to-game.dto';
import { GetCurrentUser, type UserWithProfile } from '@/shared/decorators/get-current-user.decorator';

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller('comment')
export class CommentController {
  constructor(
    private readonly commentService: CommentService
  ) {}
  
  @Post('/profile')
  @UseGuards(AuthGuard)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.CREATED)
  async addCommentToProfile(
    @GetCurrentUser() user: UserWithProfile,
    @Body() body: AddCommentToProfileDto
  ) {
    await this.commentService.addCommentToProfile({
      ...body,
      userId: user.id
    });
  }
  
  @Get('/profile/:id')
  async getCommentsByProfileId(@Param('id') id: string) {
    const comments = await this.commentService.getCommentsByProfileId(id);
    
    return { comments };
  }
  
  @Post('/game')
  @UseGuards(AuthGuard)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.CREATED)
  async addCommentToGame(
    @GetCurrentUser() user: UserWithProfile,
    @Body() body: AddCommentToGameDto
  ) {
    await this.commentService.addCommentToGame({
      ...body,
      userId: user.id
    });
  }
  
  @Get('/game/:id')
  async getCommentsByGameId(@Param('id') id: string) {
    const comments = await this.commentService.getCommentsByGameId(id);
    
    return { comments };
  }
}