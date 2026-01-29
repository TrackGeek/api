import { Controller, Get, Param } from "@nestjs/common";
import type { UserService } from "./user.service";

@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get(':username')
  async meGet(@Param('username') username: string) {
    const user = await this.userService.getUserByUsername(username);

    return { user }
  }
}
