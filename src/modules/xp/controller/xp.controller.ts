import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { GetXpHistoryDto } from "../dto/get-xp-history.dto";
import { XpService } from "../service/xp.service";

@ApiTags("Xp")
@Controller("/xp")
export class XpController {
  constructor(private readonly xpService: XpService) {}

  @Get("/me")
  @UseGuards(AuthGuard)
  async getMyXp(@Session() session: UserSession) {
    const xp = await this.xpService.getXpByUserId(session.user.id);

    return { xp };
  }

  @Get("/history")
  @UseGuards(AuthGuard)
  async getMyXpHistory(@Session() session: UserSession, @Query() query: GetXpHistoryDto) {
    const history = await this.xpService.getXpHistory(session.user.id, query);

    return { history };
  }

  @Get("/user/:username")
  async getXpByUsername(@Param("username") username: string) {
    const xp = await this.xpService.getXpByUsername(username);

    return { xp };
  }
}
