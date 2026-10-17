import type { MediaType } from "@/shared/media-filter/media-filter.constants";

export const MEDIA_ID_FIELDS = {
  anime: "malId",
  manga: "anilistId",
  tv: "tmdbId",
  movie: "tmdbId",
  game: "igdbId",
  book: "hardcoverId",
} as const;

export function normalizeMedia(type: MediaType, media: Record<string, unknown>, persisted = false) {
  const synopsis = media.synopsis ?? media.overview ?? media.description ?? media.summary;
  return {
    type,
    id: persisted ? media.id : undefined,
    externalId: media[MEDIA_ID_FIELDS[type]],
    title: media.title ?? media.name,
    synopsis: typeof synopsis === "string" ? synopsis.slice(0, persisted ? 4000 : 240) : undefined,
    releaseDate: media.releaseDate ?? media.firstAirDate ?? media.startDate,
    releaseYear: media.releaseYear,
    imageUrl: media.imageUrl ?? media.posterUrl ?? media.coverUrl,
    genres: media.genres ?? media.categories,
    platforms: media.platforms,
    numberOfPages: media.numberOfPages,
    numberOfChapters: media.numberOfChapters,
    numberOfEpisodes: media.numberOfEpisodes,
    score: media.tgReviewScore,
  };
}
