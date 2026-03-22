import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { UserService } from "../service/user.service";
import { ApiTags } from '@nestjs/swagger';
import { GetFollowersDto } from '../dto/get-followers.dto';
import { GetFollowingDto } from '../dto/get-following.dto';

@ApiTags("User")
@Controller("/user")
export class UserController {
  constructor(private readonly userService: UserService) {}
  
  @Get("/:username")
  async getUserByUsername(@Param("username") username: string) {
    const user = await this.userService.getUserByUsername(username);
    
    return { user }
  }

  @Post("/follow/:followingId")
  @UseGuards(AuthGuard)
  async followUser(@Session() session: UserSession, @Param("followingId", new ParseUUIDPipe()) followingId: string) {
    await this.userService.followUser(session.user.id, followingId);
  }

  @Post("/unfollow/:unfollowId")
  @UseGuards(AuthGuard)
  async unfollowUser(@Session() session: UserSession, @Param("unfollowId", new ParseUUIDPipe()) unfollowId: string) {
    await this.userService.unfollowUser(session.user.id, unfollowId);
  }
  
  @Get("/follower")
  async follow(@Param() getFollowersDto: GetFollowersDto) {
    const followers = await this.userService.getFollwoers(getFollowersDto);
    
    return { followers }
  }

  @Get("/following")
  async getFollowing(@Param() getFollowingDto: GetFollowingDto) {
    const following = await this.userService.getFollowing(getFollowingDto);
    
    return { following }
  }
}
