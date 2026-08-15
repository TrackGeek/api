import { GameVideoProvider } from "@prisma/generated/enums";

export interface ParsedVideoUrl {
  provider: GameVideoProvider;
  url: string;
}

const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"];
const YOUTUBE_SHORT_HOSTS = ["youtu.be"];
const YOUTUBE_PATH_PREFIXES = ["/embed/", "/shorts/", "/live/", "/v/"];
const YOUTUBE_ID = /^[\w-]{11}$/;

const TWITCH_HOSTS = ["twitch.tv", "www.twitch.tv", "m.twitch.tv"];
const TWITCH_CLIP_HOSTS = ["clips.twitch.tv"];
const TWITCH_SLUG = /^[\w-]{1,120}$/;
const TWITCH_VIDEO_ID = /^\d{1,20}$/;

function parseYouTube(parsed: URL): ParsedVideoUrl | null {
  const id = YOUTUBE_SHORT_HOSTS.includes(parsed.hostname)
    ? parsed.pathname.slice(1)
    : (parsed.searchParams.get("v") ??
      YOUTUBE_PATH_PREFIXES.reduce<string | null>(
        (found, prefix) => found ?? (parsed.pathname.startsWith(prefix) ? parsed.pathname.slice(prefix.length) : null),
        null,
      ));

  if (!id || !YOUTUBE_ID.test(id)) {
    return null;
  }

  return { provider: GameVideoProvider.YouTube, url: `https://www.youtube.com/watch?v=${id}` };
}

function parseTwitch(parsed: URL): ParsedVideoUrl | null {
  const segments = parsed.pathname.split("/").filter(Boolean);

  if (TWITCH_CLIP_HOSTS.includes(parsed.hostname)) {
    const [slug] = segments;

    return slug && TWITCH_SLUG.test(slug)
      ? { provider: GameVideoProvider.Twitch, url: `https://clips.twitch.tv/${slug}` }
      : null;
  }

  if (segments[0] === "videos") {
    const [, id] = segments;

    return id && TWITCH_VIDEO_ID.test(id)
      ? { provider: GameVideoProvider.Twitch, url: `https://www.twitch.tv/videos/${id}` }
      : null;
  }

  if (segments[1] === "clip") {
    const [, , slug] = segments;

    return slug && TWITCH_SLUG.test(slug)
      ? { provider: GameVideoProvider.Twitch, url: `https://clips.twitch.tv/${slug}` }
      : null;
  }

  return null;
}

export function parseVideoUrl(url: string): ParsedVideoUrl | null {
  let parsed: URL;

  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }

  if (YOUTUBE_HOSTS.includes(parsed.hostname) || YOUTUBE_SHORT_HOSTS.includes(parsed.hostname)) {
    return parseYouTube(parsed);
  }

  if (TWITCH_HOSTS.includes(parsed.hostname) || TWITCH_CLIP_HOSTS.includes(parsed.hostname)) {
    return parseTwitch(parsed);
  }

  return null;
}
