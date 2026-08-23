import { MissionMetric, XpReason } from "@prisma/generated/enums";

export const XP_REASON_TO_MISSION_METRIC: Partial<Record<XpReason, MissionMetric>> = {
  [XpReason.EpisodeWatched]: MissionMetric.EpisodesWatched,
  [XpReason.ProgressCompleted]: MissionMetric.ProgressCompleted,
  [XpReason.ReviewAdded]: MissionMetric.ReviewsWritten,
  [XpReason.FavoriteAdded]: MissionMetric.FavoritesAdded,
  [XpReason.ListCreated]: MissionMetric.ListsCreated,
  [XpReason.ListItemAdded]: MissionMetric.ListItemsAdded,
  [XpReason.Followed]: MissionMetric.UsersFollowed,
  [XpReason.CommentAdded]: MissionMetric.CommentsWritten,
};

export const DERIVED_MISSION_METRICS = [
  MissionMetric.ContentTypesReviewed,
  MissionMetric.LevelReached,
  MissionMetric.StreakReached,
] as const;

export type DerivedMissionMetric = (typeof DERIVED_MISSION_METRICS)[number];

export const XP_REASON_TO_DERIVED_METRICS: Partial<Record<XpReason, DerivedMissionMetric[]>> = {
  [XpReason.ReviewAdded]: [MissionMetric.ContentTypesReviewed],
  [XpReason.StreakBonus]: [MissionMetric.StreakReached],
};
