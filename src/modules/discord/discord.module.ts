import { Module } from "@nestjs/common";
import { DiscordController } from "./controller/discord.controller";
import { DiscordGatewayService } from "./service/discord-gateway.service";
import { DiscordPresenceService } from "./service/discord-presence.service";

@Module({
  controllers: [DiscordController],
  providers: [DiscordGatewayService, DiscordPresenceService],
  exports: [DiscordGatewayService, DiscordPresenceService],
})
export class DiscordModule {}
