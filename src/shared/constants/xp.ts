import { ContentType, FavoriteType, XpReason } from "@prisma/generated/enums";

export const XP_CURVE_EXPONENT = 1.6;

export const GLOBAL_XP_BASE = 100;

export const CONTENT_XP_BASE = 60;

export const STREAK_BASE_XP = 10;
export const STREAK_STEP_XP = 5;
export const STREAK_MAX_MULTIPLIER = 7;

export const LEVEL_MILESTONES = [10, 25, 50, 100] as const;

export const LEVEL_MILESTONE_MEDAL_NAMES: Record<number, string> = {
  10: "level-10",
  25: "level-25",
  50: "level-50",
  100: "level-100",
};

export const COINS_PER_LEVEL = 10;

type XpRule = {
  amount: number;
  dailyCap: number | null;
};

export const XP_RULES: Record<XpReason, XpRule> = {
  [XpReason.EpisodeWatched]: { amount: 5, dailyCap: 150 },
  [XpReason.ProgressStarted]: { amount: 10, dailyCap: 100 },
  [XpReason.ProgressCompleted]: { amount: 40, dailyCap: 400 },
  [XpReason.ReviewAdded]: { amount: 75, dailyCap: 225 },
  [XpReason.ListCreated]: { amount: 25, dailyCap: 75 },
  [XpReason.ListItemAdded]: { amount: 2, dailyCap: 50 },
  [XpReason.FavoriteAdded]: { amount: 5, dailyCap: 50 },
  [XpReason.Followed]: { amount: 3, dailyCap: 30 },
  [XpReason.CommentAdded]: { amount: 3, dailyCap: 30 },
  [XpReason.ReactionAdded]: { amount: 1, dailyCap: 10 },
  [XpReason.StreakBonus]: { amount: STREAK_BASE_XP, dailyCap: null },
  [XpReason.MissionCompleted]: { amount: 0, dailyCap: null },
};

export const XP_SOURCE_KEYS = {
  episode: (contentType: ContentType, mediaId: string, episode: number) =>
    `episode:${contentType}:${mediaId}:${episode}`,
  progressStarted: (contentType: ContentType, mediaId: string) => `progress-started:${contentType}:${mediaId}`,
  progressCompleted: (contentType: ContentType, mediaId: string) => `progress-completed:${contentType}:${mediaId}`,
  progress: (reason: XpReason, contentType: ContentType, mediaId: string) =>
    reason === XpReason.ProgressCompleted
      ? XP_SOURCE_KEYS.progressCompleted(contentType, mediaId)
      : XP_SOURCE_KEYS.progressStarted(contentType, mediaId),
  review: (contentType: ContentType, mediaId: string) => `review:${contentType}:${mediaId}`,
  favorite: (kind: ContentType | FavoriteType, mediaId: string) => `favorite:${kind}:${mediaId}`,
  list: (listId: string) => `list:${listId}`,
  listItem: (listId: string, mediaId: string) => `list-item:${listId}:${mediaId}`,
  follow: (followingId: string) => `follow:${followingId}`,
  comment: (commentId: string) => `comment:${commentId}`,
  reaction: (reactionId: string) => `reaction:${reactionId}`,
  streak: (day: string) => `streak:${day}`,
  mission: (missionId: string) => `mission:${missionId}`,
  levelUp: (level: number) => `level-up:${level}`,
} as const;
