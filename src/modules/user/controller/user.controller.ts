import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { UserService } from "../service/user.service";
import { ApiTags } from "@nestjs/swagger";
import { GetFollowersDto } from "../dto/get-followers.dto";
import { GetFollowingDto } from "../dto/get-following.dto";
import { SearchUserDto } from "../dto/search-user.dto";
import { UpdateUserDto } from "../dto/update-user.dto";

@ApiTags("User")
@Controller("/user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch("/")
  @UseGuards(AuthGuard)
  async updateUser(@Session() session: UserSession, @Body() body: UpdateUserDto) {
    await this.userService.updateUser({
      ...body,
      userId: session.user.id,
    });
  }

  @Get("/username/:username")
  async getUserByUsername(@Param("username") username: string) {
    const user = await this.userService.getUserByUsername(username);

    return { user };
  }

  @Get("/id/:id")
  async getUserById(@Param("id") id: string) {
    const user = await this.userService.getUserById(id);

    return { user };
  }

  @Get("/search")
  async searchUser(@Query() searchUserDto: SearchUserDto) {
    const users = await this.userService.searchUser(searchUserDto);

    return { users };
  }

  @Post("/follow/:followId")
  @UseGuards(AuthGuard)
  async followUser(@Session() session: UserSession, @Param("followId", new ParseUUIDPipe()) followId: string) {
    await this.userService.followUser(session.user.id, followId);
  }

  @Post("/unfollow/:unfollowId")
  @UseGuards(AuthGuard)
  async unfollowUser(@Session() session: UserSession, @Param("unfollowId", new ParseUUIDPipe()) unfollowId: string) {
    await this.userService.unfollowUser(session.user.id, unfollowId);
  }

  @Get("/follower")
  async getFollowers(@Query() getFollowersDto: GetFollowersDto) {
    const followers = await this.userService.getFollowers(getFollowersDto);

    return { followers };
  }

  @Get("/following")
  async getFollowing(@Query() getFollowingDto: GetFollowingDto) {
    const following = await this.userService.getFollowing(getFollowingDto);

    return { following };
  }
}
