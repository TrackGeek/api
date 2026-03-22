import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { UserService } from "../service/user.service";
import { ApiTags } from '@nestjs/swagger';

@ApiTags("User")
@Controller("/user")
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}
  
  @Get("/:username")
  async getUserByUsername(@Param("username") username: string) {
    const user = await this.userService.getUserByUsername(username);
    
    return { user }
  }

  @Post("/follow/:followingId")
  async followUser(@Session() session: UserSession, @Param("followingId", new ParseUUIDPipe()) followingId: string) {
    await this.userService.followUser(session.user.id, followingId);
  }

  @Post("/unfollow/:unfollowId")
  async unfollowUser(@Session() session: UserSession, @Param("unfollowId", new ParseUUIDPipe()) unfollowId: string) {
    await this.userService.unfollowUser(session.user.id, unfollowId);
  }
}
