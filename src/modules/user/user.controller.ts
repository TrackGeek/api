import { Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession,  } from '@thallesp/nestjs-better-auth';

import { UserService } from "./user.service";
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';

@Controller("user")
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) { }
  
  @Post('/follow/:id')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async followUser(@Session() session: UserSession, @Param('id') id: string) {
    await this.userService.followUser(session.user.id, id);
  }

  @Post('/unfollow/:id')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 4, window: 60, blockDuration: 300 })
  @HttpCode(HttpStatus.OK)
  async unfollowUser(@Session() session: UserSession, @Param('id') id: string) {
    await this.userService.unfollowUser(session.user.id, id);
  }
}
