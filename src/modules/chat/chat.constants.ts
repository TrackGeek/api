export const MAX_MESSAGE_LENGTH = 2000;

export const CHAT_STICKER_IDS = ["trackgeek-logo"] as const;

export const CHAT_EVENTS = {
  messageNew: "message:new",
  messageDeleted: "message:deleted",
  conversationRead: "conversation:read",
  adminMessageNew: "admin:message:new",
  adminMessageDeleted: "admin:message:deleted",
  adminReportNew: "admin:report:new",
  presenceUpdate: "presence:update",
  typing: "typing",
  typingStart: "typing:start",
  typingStop: "typing:stop",
  presenceActivity: "presence:activity",
  presenceSubscribe: "presence:subscribe",
  presenceUnsubscribe: "presence:unsubscribe",
} as const;

export const chatUserRoom = (userId: string) => `user:${userId}`;

export const CHAT_ADMINS_ROOM = "admins";

export const PRESENCE_TTL_SECONDS = 86_400;

export const PRESENCE_INSTANCE_TTL_SECONDS = 60;

export const PRESENCE_HEARTBEAT_INTERVAL_MS = 20_000;

export const MAX_PRESENCE_IDS_PER_CALL = 100;

export const MAX_PRESENCE_WATCH_ROOMS = 300;

export const PRESENCE_WATCH_PREFIX = "presence:watch:";

export const presenceWatchRoom = (userId: string) => `${PRESENCE_WATCH_PREFIX}${userId}`;

export const presenceInstanceKey = (instanceId: string) => `presence:instance:${instanceId}`;

export const CONVERSATION_MEMBERS_TTL_SECONDS = 600;

export const presenceKey = (userId: string) => `presence:${userId}`;

export const conversationMembersKey = (conversationId: string) => `chat:conv:${conversationId}:members`;
