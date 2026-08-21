import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  type Activity,
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  type Guild,
  type Presence,
  type PresenceStatus,
} from "discord.js";
import { CACHE_KEYS } from "@/shared/constants/cache";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { SPOTIFY_ACTIVITY_NAME, TRACKGEEK_GUILD_ID } from "../constants/discord";
import type {
  DiscordActivityPresence,
  DiscordPresence,
  DiscordPresenceStatus,
  DiscordSpotifyPresence,
} from "../types/discord";

const SPOTIFY_ASSET_PREFIX = "spotify:";
const SPOTIFY_IMAGE_URL = "https://i.scdn.co/image";
const SPOTIFY_TRACK_URL = "https://open.spotify.com/track";

type GatewayPresence = Pick<DiscordPresence, "status" | "customStatus" | "spotify" | "activities">;

@Injectable()
export class DiscordGatewayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscordGatewayService.name);

  private readonly client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences],
  });

  private ready = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  async onModuleInit() {
    const token = this.configService.get<string>("DISCORD_BOT_TOKEN");

    if (!token) {
      this.logger.warn("DISCORD_BOT_TOKEN is not set, Discord presence tracking is disabled");

      return;
    }

    this.client.on(Events.ClientReady, (client) => {
      this.ready = true;

      this.logger.log(`Discord bot logged in as ${client.user.tag}`);

      void this.warmupPresences();
    });

    this.client.on(Events.PresenceUpdate, (_oldPresence, newPresence) => {
      if (newPresence.guild?.id !== TRACKGEEK_GUILD_ID || !newPresence.userId) return;

      if (newPresence.user?.bot) return;

      void this.cachePresence(newPresence.userId, this.serializePresence(newPresence));
    });

    this.client.on(Events.GuildMemberRemove, (member) => {
      if (member.guild.id !== TRACKGEEK_GUILD_ID) return;

      void this.cacheService.delete(CACHE_KEYS.DISCORD_PRESENCE.prefix(member.id));
    });

    this.client.on(Events.Error, (error) => {
      this.logger.error("Discord client error", error);
    });

    try {
      await this.client.login(token);
    } catch (error) {
      this.logger.error("Failed to log in the Discord bot", error);
    }
  }

  async onModuleDestroy() {
    if (!this.ready) return;

    await this.client.destroy();
  }

  async isMemberOfGuild(discordId: string): Promise<boolean> {
    const guild = this.getGuild();

    if (!guild) return false;

    if (guild.members.cache.has(discordId)) return true;

    try {
      const member = await guild.members.fetch(discordId);

      return !!member;
    } catch {
      return false;
    }
  }

  async getPresence(discordId: string): Promise<GatewayPresence | null> {
    const presence = this.getGuild()?.presences.cache.get(discordId);

    if (presence) {
      return this.serializePresence(presence);
    }

    return this.cacheService.get<GatewayPresence>(CACHE_KEYS.DISCORD_PRESENCE.prefix(discordId));
  }

  private getGuild(): Guild | null {
    if (!this.ready) return null;

    return this.client.guilds.cache.get(TRACKGEEK_GUILD_ID) ?? null;
  }

  private async warmupPresences() {
    const guild = this.getGuild();

    if (!guild) {
      this.logger.warn(`The Discord bot is not a member of the guild ${TRACKGEEK_GUILD_ID}`);

      return;
    }

    try {
      await guild.members.fetch({ withPresences: true });

      const presences = guild.members.cache
        .filter((member) => !member.user.bot)
        .map((member) => member.presence)
        .filter((presence): presence is Presence => !!presence);

      await Promise.all(
        presences.map((presence) => this.cachePresence(presence.userId, this.serializePresence(presence))),
      );

      this.logger.log(`Cached ${presences.length} Discord presences from ${guild.name}`);
    } catch (error) {
      this.logger.error("Failed to warm up Discord presences", error);
    }
  }

  private async cachePresence(discordId: string, presence: GatewayPresence) {
    try {
      await this.cacheService.set(
        CACHE_KEYS.DISCORD_PRESENCE.prefix(discordId),
        presence,
        CACHE_KEYS.DISCORD_PRESENCE.expiration,
      );
    } catch (error) {
      this.logger.error(`Failed to cache the Discord presence of ${discordId}`, error);
    }
  }

  private serializePresence(presence: Presence): GatewayPresence {
    const custom = presence.activities.find((activity) => activity.type === ActivityType.Custom);
    const spotify = presence.activities.find((activity) => this.isSpotify(activity));

    const activities = presence.activities
      .filter((activity) => activity.type !== ActivityType.Custom && !this.isSpotify(activity))
      .map((activity) => this.serializeActivity(activity));

    return {
      status: this.serializeStatus(presence.status),
      customStatus: custom?.state ?? null,
      spotify: spotify ? this.serializeSpotify(spotify) : null,
      activities,
    };
  }

  private serializeStatus(status: PresenceStatus): DiscordPresenceStatus {
    return status === "invisible" ? "offline" : status;
  }

  private isSpotify(activity: Activity): boolean {
    return activity.type === ActivityType.Listening && activity.name === SPOTIFY_ACTIVITY_NAME;
  }

  private serializeSpotify(activity: Activity): DiscordSpotifyPresence {
    const largeImage = activity.assets?.largeImage ?? null;

    return {
      trackId: activity.syncId,
      name: activity.details ?? activity.name,
      artists: activity.state ?? "",
      album: activity.assets?.largeText ?? null,
      albumArtUrl: largeImage?.startsWith(SPOTIFY_ASSET_PREFIX)
        ? `${SPOTIFY_IMAGE_URL}/${largeImage.slice(SPOTIFY_ASSET_PREFIX.length)}`
        : (activity.assets?.largeImageURL() ?? null),
      url: activity.syncId ? `${SPOTIFY_TRACK_URL}/${activity.syncId}` : null,
      startedAt: activity.timestamps?.start?.toISOString() ?? null,
      endsAt: activity.timestamps?.end?.toISOString() ?? null,
    };
  }

  private serializeActivity(activity: Activity): DiscordActivityPresence {
    return {
      name: activity.name,
      type: activity.type,
      applicationId: activity.applicationId,
      details: activity.details,
      state: activity.state,
      largeImageUrl: activity.assets?.largeImageURL() ?? null,
      smallImageUrl: activity.assets?.smallImageURL() ?? null,
      largeText: activity.assets?.largeText ?? null,
      smallText: activity.assets?.smallText ?? null,
      startedAt: activity.timestamps?.start?.toISOString() ?? null,
    };
  }
}
