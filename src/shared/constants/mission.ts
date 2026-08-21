import { MissionMetric, XpReason } from "@prisma/generated/enums";

// Só a REGRA DE CONTAGEM vive em código (tipada). As instâncias — meta,
// recompensa, tier, ordem — vivem no banco e são editáveis sem deploy.

// Métricas de contador: avançam +1 a cada evento que de fato concedeu XP.
// Teto diário batido não infla missão, porque o XP não foi concedido.
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

// Métricas derivadas: não dá pra somar +1, precisam de uma query pontual.
// São raras o bastante para não pesar.
export const DERIVED_MISSION_METRICS = [
  MissionMetric.ContentTypesReviewed,
  MissionMetric.LevelReached,
  MissionMetric.StreakReached,
] as const;

export type DerivedMissionMetric = (typeof DERIVED_MISSION_METRICS)[number];

export function isDerivedMetric(metric: MissionMetric): metric is DerivedMissionMetric {
  return (DERIVED_MISSION_METRICS as readonly MissionMetric[]).includes(metric);
}

// Quais derivadas recalcular quando chega cada evento.
export const XP_REASON_TO_DERIVED_METRICS: Partial<Record<XpReason, DerivedMissionMetric[]>> = {
  [XpReason.ReviewAdded]: [MissionMetric.ContentTypesReviewed],
  [XpReason.StreakBonus]: [MissionMetric.StreakReached],
};
