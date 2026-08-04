export const MEDIA_TYPES = ["anime", "manga", "tv", "movie", "game", "book"] as const;

export type MediaType = (typeof MEDIA_TYPES)[number];

/**
 * Provider-agnostic release state. Every provider ships its own status vocabulary
 * (MAL, AniList, TMDB, IGDB, Hardcover), so everything is normalized to this enum
 * before it reaches the API surface.
 */
export enum MediaReleaseState {
  Unreleased = "Unreleased",
  Ongoing = "Ongoing",
  Hiatus = "Hiatus",
  Finished = "Finished",
  Cancelled = "Cancelled",
}

/** Display order used when returning the states available in a user's library. */
export const MEDIA_RELEASE_STATE_ORDER: MediaReleaseState[] = [
  MediaReleaseState.Ongoing,
  MediaReleaseState.Finished,
  MediaReleaseState.Hiatus,
  MediaReleaseState.Unreleased,
  MediaReleaseState.Cancelled,
];

type RawStatusesByState = Partial<Record<MediaReleaseState, string[]>>;

/** Raw provider status strings stored on each media table, grouped by normalized state. */
export const RAW_STATUSES_BY_STATE: Record<MediaType, RawStatusesByState> = {
  anime: {
    [MediaReleaseState.Ongoing]: ["Currently Airing"],
    [MediaReleaseState.Finished]: ["Finished Airing"],
    [MediaReleaseState.Unreleased]: ["Not yet aired"],
  },
  manga: {
    [MediaReleaseState.Ongoing]: ["Publishing"],
    [MediaReleaseState.Finished]: ["Finished"],
    [MediaReleaseState.Hiatus]: ["On Hiatus"],
    [MediaReleaseState.Unreleased]: ["Not yet published"],
    [MediaReleaseState.Cancelled]: ["Discontinued"],
  },
  tv: {
    [MediaReleaseState.Ongoing]: ["Returning Series"],
    [MediaReleaseState.Finished]: ["Ended"],
    [MediaReleaseState.Unreleased]: ["Planned", "In Production", "Pilot"],
    [MediaReleaseState.Cancelled]: ["Canceled", "Cancelled"],
  },
  movie: {
    [MediaReleaseState.Finished]: ["Released"],
    [MediaReleaseState.Unreleased]: ["Planned", "In Production", "Post Production", "Rumored"],
    [MediaReleaseState.Cancelled]: ["Canceled", "Cancelled"],
  },
  game: {
    [MediaReleaseState.Ongoing]: ["Alpha", "Beta", "Early Access"],
    [MediaReleaseState.Finished]: ["Released"],
    [MediaReleaseState.Unreleased]: ["Not Released", "Offline"],
    [MediaReleaseState.Cancelled]: ["Cancelled", "Canceled", "Delisted"],
  },
  // Hardcover exposes no release status, so book states are derived from the release date.
  book: {},
};

const STATE_BY_RAW_STATUS = new Map<string, MediaReleaseState>(
  Object.entries(RAW_STATUSES_BY_STATE).flatMap(([mediaType, statesByRaw]) =>
    Object.entries(statesByRaw).flatMap(([state, rawStatuses]) =>
      (rawStatuses as string[]).map((rawStatus) => [`${mediaType}:${rawStatus}`, state as MediaReleaseState] as const),
    ),
  ),
);

export function toMediaReleaseState(mediaType: MediaType, rawStatus: string | null): MediaReleaseState | null {
  if (!rawStatus) return null;

  return STATE_BY_RAW_STATUS.get(`${mediaType}:${rawStatus}`) ?? null;
}

export function rawStatusesForStates(mediaType: MediaType, states: MediaReleaseState[]): string[] {
  return states.flatMap((state) => RAW_STATUSES_BY_STATE[mediaType][state] ?? []);
}

/** A media is "released" once it left the unreleased state. */
export function unreleasedRawStatuses(mediaType: MediaType): string[] {
  return RAW_STATUSES_BY_STATE[mediaType][MediaReleaseState.Unreleased] ?? [];
}

/** `false` for providers without a release status — those fall back to the release date. */
export function hasReleaseStatusColumn(mediaType: MediaType): boolean {
  return Object.keys(RAW_STATUSES_BY_STATE[mediaType]).length > 0;
}
