import type {
  TMDBLocalizedMedia,
  TMDBMediaReference,
  TMDBWatchMediaType,
} from "@/shared/infra/integrations/tmdb.service";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

function mediaTypeForKey(key: string, fallback?: TMDBWatchMediaType): TMDBWatchMediaType | undefined {
  if (["movie", "movies", "topMovies"].includes(key)) return "movie";
  if (["tvShow", "tvShows", "topTVShows"].includes(key)) return "tv";
  return fallback;
}

function getReference(record: Record<string, unknown>, hint?: TMDBWatchMediaType): TMDBMediaReference | null {
  if (typeof record.key === "string" && "imageUrl" in record) {
    const match = /^(movie|tv):([1-9]\d*)$/.exec(record.key);
    if (match) return { mediaType: match[1] as TMDBWatchMediaType, tmdbId: Number(match[2]) };
  }
  if (!Number.isSafeInteger(record.tmdbId) || Number(record.tmdbId) <= 0 || !("posterUrl" in record)) return null;
  const mediaType =
    record.mediaType === "movie" || record.mediaType === "tv"
      ? record.mediaType
      : "firstAirDate" in record || "originalName" in record
        ? "tv"
        : "title" in record || "originalTitle" in record
          ? "movie"
          : hint;
  return mediaType ? { mediaType, tmdbId: record.tmdbId as number } : null;
}

export function collectTmdbMedia(value: unknown, hint?: TMDBWatchMediaType): TMDBMediaReference[] {
  if (Array.isArray(value)) return value.flatMap((item) => collectTmdbMedia(item, hint));
  if (!isRecord(value)) return [];
  const reference = getReference(value, hint);
  return [
    ...(reference ? [reference] : []),
    ...Object.entries(value).flatMap(([key, item]) => collectTmdbMedia(item, mediaTypeForKey(key, hint))),
  ];
}

export function applyTmdbLocalizations(
  value: unknown,
  localized: Map<string, TMDBLocalizedMedia>,
  hint?: TMDBWatchMediaType,
): unknown {
  if (Array.isArray(value)) return value.map((item) => applyTmdbLocalizations(item, localized, hint));
  if (!isRecord(value)) return value;
  const result = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      applyTmdbLocalizations(item, localized, mediaTypeForKey(key, hint)),
    ]),
  );
  const reference = getReference(value, hint);
  if (!reference) return result;
  const media = localized.get(`${reference.mediaType}:${reference.tmdbId}`);
  if (!media) return result;
  if (media.title) {
    if ("title" in value) result.title = media.title;
    if ("name" in value) result.name = media.title;
  }
  if (media.posterUrl) {
    if ("posterUrl" in value) result.posterUrl = media.posterUrl;
    if ("imageUrl" in value) result.imageUrl = media.posterUrl;
  }
  if (media.overview) {
    result.overview = media.overview;
    if (reference.mediaType === "tv" && "tagline" in value) result.tagline = media.overview;
  }
  return result;
}
