import { CatchupMediaType, ProgressStatus, ReleaseEventType, ReleaseSource } from "@prisma/generated/enums";

export interface CatchupMediaConfig {
  readonly model: "anime" | "manga" | "tvShow" | "game";
  readonly externalIdField: "malId" | "anilistId" | "tmdbId" | "igdbId";
  readonly titleField: "title" | "name";
  readonly eventForeignKey: "animeId" | "mangaId" | "tvShowId" | "gameId";
  readonly progressModel: "animeProgress" | "mangaProgress" | "tvShowProgress" | "gameProgress";
  readonly progressForeignKey: "animeId" | "mangaId" | "tvShowId" | "gameId";
  readonly source: ReleaseSource;
  readonly eventType: ReleaseEventType;
  readonly activeStatus: ProgressStatus;
  readonly interestStatuses: readonly ProgressStatus[];
  readonly planningStatuses: readonly ProgressStatus[];
  readonly onHoldStatuses: readonly ProgressStatus[];
  readonly supportsAutoReopen: boolean;
}

export const CATCHUP_MEDIA_CONFIG: Record<CatchupMediaType, CatchupMediaConfig> = {
  [CatchupMediaType.Anime]: {
    model: "anime",
    externalIdField: "malId",
    titleField: "title",
    eventForeignKey: "animeId",
    progressModel: "animeProgress",
    progressForeignKey: "animeId",
    source: ReleaseSource.Tenrai,
    eventType: ReleaseEventType.NewEpisodeReleased,
    activeStatus: ProgressStatus.Watching,
    interestStatuses: [ProgressStatus.Watching, ProgressStatus.Rewatching, ProgressStatus.Completed],
    planningStatuses: [ProgressStatus.Planning, ProgressStatus.NotWatched],
    onHoldStatuses: [ProgressStatus.Paused],
    supportsAutoReopen: true,
  },
  [CatchupMediaType.Manga]: {
    model: "manga",
    externalIdField: "anilistId",
    titleField: "title",
    eventForeignKey: "mangaId",
    progressModel: "mangaProgress",
    progressForeignKey: "mangaId",
    source: ReleaseSource.Anilist,
    eventType: ReleaseEventType.NewChapterReleased,
    activeStatus: ProgressStatus.Reading,
    interestStatuses: [ProgressStatus.Reading, ProgressStatus.Rereading, ProgressStatus.Completed],
    planningStatuses: [ProgressStatus.Planning, ProgressStatus.NotRead],
    onHoldStatuses: [ProgressStatus.Paused],
    supportsAutoReopen: true,
  },
  [CatchupMediaType.TvShow]: {
    model: "tvShow",
    externalIdField: "tmdbId",
    titleField: "name",
    eventForeignKey: "tvShowId",
    progressModel: "tvShowProgress",
    progressForeignKey: "tvShowId",
    source: ReleaseSource.Tmdb,
    eventType: ReleaseEventType.NewEpisodeReleased,
    activeStatus: ProgressStatus.Watching,
    interestStatuses: [ProgressStatus.Watching, ProgressStatus.Rewatching, ProgressStatus.Completed],
    planningStatuses: [ProgressStatus.Planning, ProgressStatus.NotWatched],
    onHoldStatuses: [ProgressStatus.Paused],
    supportsAutoReopen: true,
  },
  [CatchupMediaType.Game]: {
    model: "game",
    externalIdField: "igdbId",
    titleField: "name",
    eventForeignKey: "gameId",
    progressModel: "gameProgress",
    progressForeignKey: "gameId",
    source: ReleaseSource.Igdb,
    eventType: ReleaseEventType.NewGameReleased,
    activeStatus: ProgressStatus.Playing,
    interestStatuses: [ProgressStatus.Planning, ProgressStatus.NotPlayed],
    planningStatuses: [ProgressStatus.Planning, ProgressStatus.NotPlayed],
    onHoldStatuses: [ProgressStatus.Paused],
    supportsAutoReopen: false,
  },
};
