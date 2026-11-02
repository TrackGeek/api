import { Body, Controller, Delete, Get, Header, Param, ParseUUIDPipe, Post, Put, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { LinkPsnAccountDto } from "../dto/link-psn-account.dto";
import { PsnAccountService } from "../service/psn-account.service";
import { PsnTrophyService } from "../service/psn-trophy.service";

@ApiTags("PSN")
@Controller("/psn")
export class PsnController {
  constructor(
    private readonly psnAccountService: PsnAccountService,
    private readonly psnTrophyService: PsnTrophyService,
  ) {}

  @Get("/trophies/:userId")
  async getTrophiesByUserId(@Param("userId", new ParseUUIDPipe()) userId: string) {
    const trophies = await this.psnTrophyService.getTrophiesByUserId(userId);

    return { trophies };
  }

  @Post("/trophies/refresh")
  @UseGuards(AuthGuard)
  @Throttle({ write: { limit: 5, ttl: 60_000 } })
  async refreshTrophies(@Session() session: UserSession) {
    const trophies = await this.psnTrophyService.refreshTrophiesByUserId(session.user.id);

    return { trophies };
  }

  @Get("/account")
  @UseGuards(AuthGuard)
  @Header("Cache-Control", "no-store")
  async getAccount(@Session() session: UserSession) {
    const account = await this.psnAccountService.getStatus(session.user.id);

    return { account };
  }

  @Put("/account")
  @UseGuards(AuthGuard)
  @Throttle({ write: { limit: 5, ttl: 60_000 } })
  async linkAccount(@Session() session: UserSession, @Body() body: LinkPsnAccountDto) {
    const account = await this.psnAccountService.link(session.user.id, body.npsso);

    return { account };
  }

  @Delete("/account")
  @UseGuards(AuthGuard)
  async unlinkAccount(@Session() session: UserSession) {
    await this.psnAccountService.unlink(session.user.id);
  }
}
