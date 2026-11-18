import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { GetPresenceDto } from "../dto/get-presence.dto";
import { PresenceService } from "../service/presence.service";

@ApiTags("Chat")
@Controller("/presence")
@UseGuards(AuthGuard)
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Get("/")
  async getPresences(@Session() session: UserSession, @Query() query: GetPresenceDto) {
    const presences = await this.presenceService.getPresences(session.user.id, query.userIds);

    return { presences };
  }
}
