import { Injectable } from "@nestjs/common";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { DISCORD_PROVIDER_ID } from "../constants/discord";
import type { DiscordPresence } from "../types/discord";
import { DiscordGatewayService } from "./discord-gateway.service";

const EMPTY_PRESENCE: DiscordPresence = {
  linked: false,
  inGuild: false,
  status: null,
  customStatus: null,
  spotify: null,
  activities: [],
};

@Injectable()
export class DiscordPresenceService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly discordGatewayService: DiscordGatewayService,
  ) {}

  async getPresenceByUserId(userId: string): Promise<DiscordPresence> {
    const account = await this.databaseService.account.findFirst({
      where: {
        userId,
        providerId: DISCORD_PROVIDER_ID,
      },
      select: {
        accountId: true,
      },
    });

    if (!account) {
      return EMPTY_PRESENCE;
    }

    const inGuild = await this.discordGatewayService.isMemberOfGuild(account.accountId);

    if (!inGuild) {
      return { ...EMPTY_PRESENCE, linked: true };
    }

    const presence = await this.discordGatewayService.getPresence(account.accountId);

    if (!presence) {
      return { ...EMPTY_PRESENCE, linked: true, inGuild: true, status: "offline" };
    }

    return { linked: true, inGuild: true, ...presence };
  }
}
