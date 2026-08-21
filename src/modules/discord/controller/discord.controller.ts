import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DiscordPresenceService } from "../service/discord-presence.service";

@ApiTags("Discord")
@Controller("/discord")
export class DiscordController {
  constructor(private readonly discordPresenceService: DiscordPresenceService) {}

  @Get("/presence/:userId")
  async getPresenceByUserId(@Param("userId", new ParseUUIDPipe()) userId: string) {
    const presence = await this.discordPresenceService.getPresenceByUserId(userId);

    return { presence };
  }
}
