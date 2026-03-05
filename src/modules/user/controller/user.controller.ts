import { Controller, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { UserService } from "../service/user.service";

@Controller("/user")
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post("/follow/:followingId")
  async followUser(@Session() session: UserSession, @Param("followingId", new ParseUUIDPipe()) followingId: string) {
    await this.userService.followUser(session.user.id, followingId);
  }

  @Post("/unfollow/:unfollowId")
  async unfollowUser(@Session() session: UserSession, @Param("unfollowId", new ParseUUIDPipe()) unfollowId: string) {
    await this.userService.unfollowUser(session.user.id, unfollowId);
  }
}
