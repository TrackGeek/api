export type DiscordPresenceStatus = "online" | "idle" | "dnd" | "offline";

export interface DiscordSpotifyPresence {
  trackId: string | null;
  name: string;
  artists: string;
  album: string | null;
  albumArtUrl: string | null;
  url: string | null;
  startedAt: string | null;
  endsAt: string | null;
}

export interface DiscordActivityPresence {
  name: string;
  type: number;
  applicationId: string | null;
  details: string | null;
  state: string | null;
  largeImageUrl: string | null;
  smallImageUrl: string | null;
  largeText: string | null;
  smallText: string | null;
  startedAt: string | null;
}

export interface DiscordPresence {
  linked: boolean;
  inGuild: boolean;
  status: DiscordPresenceStatus | null;
  customStatus: string | null;
  spotify: DiscordSpotifyPresence | null;
  activities: DiscordActivityPresence[];
}
