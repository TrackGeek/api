import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { MessageDeletedBy } from "@prisma/generated/enums";
import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { CHAT_EVENTS, CONVERSATION_MEMBERS_TTL_SECONDS, conversationMembersKey } from "../chat.constants";
import { type MessageRecord, serializeAdminMessage, serializeMessage } from "../chat.serializer";
import type { ListAdminConversationsDto } from "../dto/list-admin-conversations.dto";
import type { ListConversationsDto } from "../dto/list-conversations.dto";
import type { ListMessagesDto } from "../dto/list-messages.dto";
import type { SendMessageDto } from "../dto/send-message.dto";
import { ChatGateway } from "../gateway/chat.gateway";
import { PresenceService, type PresenceState } from "./presence.service";

const presenceRank = (presence: PresenceState) => {
  if ("hidden" in presence) return 2;

  return presence.status === "online" ? 0 : presence.status === "away" ? 1 : 2;
};

const DEFAULT_MESSAGES_LIMIT = 30;

const MAX_FRIENDS = 500;

const chatUserSelect = {
  id: true,
  name: true,
  username: true,
  profile: { select: { avatarUrl: true, avatarFrame: true, title: true } },
} as const;

@Injectable()
export class ChatService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
    private readonly cacheService: CacheService,
    @Inject(forwardRef(() => PresenceService))
    private readonly presenceService: PresenceService,
  ) {}

  async getTypingRecipient(userId: string, conversationId: string) {
    const key = conversationMembersKey(conversationId);
    const cached = await this.cacheService.get<[string, string]>(key);

    let members = cached;

    if (!members) {
      const conversation = await this.databaseService.conversation.findUnique({ where: { id: conversationId } });

      if (!conversation?.userAId || !conversation.userBId) return null;

      members = [conversation.userAId, conversation.userBId];

      const [first, second] = members;

      if (!(await this.areFriends(first, second))) return null;

      await this.cacheService.set(key, members, CONVERSATION_MEMBERS_TTL_SECONDS);
    }

    if (!members.includes(userId)) return null;

    return members[0] === userId ? members[1] : members[0];
  }

  async areFriends(userId: string, otherUserId: string) {
    if (userId === otherUserId) return false;

    const count = await this.databaseService.following.count({
      where: {
        OR: [
          { followerId: userId, followingId: otherUserId },
          { followerId: otherUserId, followingId: userId },
        ],
      },
    });

    return count === 2;
  }

  async listFriends(userId: string) {
    const follows = await this.databaseService.following.findMany({
      where: {
        followerId: userId,
        following: { following: { some: { followingId: userId } } },
      },
      select: { following: { select: chatUserSelect } },
      orderBy: { following: { name: "asc" } },
      take: MAX_FRIENDS,
    });

    const friends = follows.map((follow) => follow.following);
    const presences = await this.presenceService.getPresences(
      userId,
      friends.map((friend) => friend.id),
    );

    return friends
      .map((friend) => ({ ...friend, presence: presences[friend.id] }))
      .sort((first, second) => {
        const rankDifference = presenceRank(first.presence) - presenceRank(second.presence);

        return rankDifference !== 0 ? rankDifference : first.name.localeCompare(second.name);
      });
  }

  async listConversations(userId: string, { page, itemsPerPage }: ListConversationsDto) {
    const result = await this.databaseService.offsetPagination({
      model: "conversation",
      page,
      itemsPerPage,
      where: { OR: [{ userAId: userId }, { userBId: userId }], lastMessageAt: { not: null } },
      orderBy: { lastMessageAt: "desc" },
      include: {
        userA: { select: chatUserSelect },
        userB: { select: chatUserSelect },
        messages: { orderBy: { id: "desc" }, take: 1 },
        participants: true,
      },
    });

    const otherUserIds = result.items.map((conversation: any) =>
      conversation.userAId === userId ? conversation.userBId : conversation.userAId,
    ) as (string | null)[];

    const presences = await this.getOtherUserPresences(userId, otherUserIds);

    const items = await Promise.all(
      result.items.map(async (conversation: any, index: number) => {
        const lastReadAt: Date | undefined = conversation.participants.find(
          (participant: any) => participant.userId === userId,
        )?.lastReadAt;
        const otherUserLastReadAt: Date | undefined = conversation.participants.find(
          (participant: any) => participant.userId !== userId,
        )?.lastReadAt;

        const unreadCount = await this.databaseService.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            deletedAt: null,
            ...(lastReadAt && { createdAt: { gt: lastReadAt } }),
          },
        });

        const [lastMessage] = conversation.messages as MessageRecord[];

        return {
          id: conversation.id,
          lastMessageAt: conversation.lastMessageAt,
          createdAt: conversation.createdAt,
          otherUser: conversation.userAId === userId ? conversation.userB : conversation.userA,
          lastMessage: lastMessage ? serializeMessage(lastMessage) : null,
          unreadCount,
          otherUserLastReadAt: otherUserLastReadAt?.toISOString() ?? null,
          otherUserPresence: presences[index],
        };
      }),
    );

    return { ...result, items };
  }

  async getOrCreateConversation(userId: string, otherUserId: string) {
    if (!(await this.areFriends(userId, otherUserId))) {
      throw new AppException(ERROR_CODES.CHAT_NOT_FRIENDS);
    }

    const [userAId, userBId] = [userId, otherUserId].sort();

    const conversation = await this.databaseService.conversation.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: { userAId, userBId },
      update: {},
      include: {
        userA: { select: chatUserSelect },
        userB: { select: chatUserSelect },
        messages: { orderBy: { id: "desc" }, take: 1 },
        participants: true,
      },
    });

    const [lastMessage] = conversation.messages;
    const [presence] = await this.getOtherUserPresences(userId, [otherUserId]);
    const otherUserLastReadAt = conversation.participants.find(
      (participant) => participant.userId !== userId,
    )?.lastReadAt;

    return {
      id: conversation.id,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
      otherUser: conversation.userAId === userId ? conversation.userB : conversation.userA,
      lastMessage: lastMessage ? serializeMessage(lastMessage) : null,
      unreadCount: 0,
      otherUserLastReadAt: otherUserLastReadAt?.toISOString() ?? null,
      otherUserPresence: presence,
    };
  }

  async listMessages(userId: string, conversationId: string, { cursor, limit }: ListMessagesDto) {
    const conversation = await this.getParticipantConversation(userId, conversationId);

    const otherUserId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;

    const [{ items, nextCursor, hasNextPage }, otherRead, otherUser, [otherUserPresence]] = await Promise.all([
      this.findMessagesPage(conversationId, cursor, limit),
      otherUserId
        ? this.databaseService.conversationRead.findUnique({
            where: { conversationId_userId: { conversationId, userId: otherUserId } },
          })
        : null,
      otherUserId ? this.databaseService.user.findUnique({ where: { id: otherUserId }, select: chatUserSelect }) : null,
      this.getOtherUserPresences(userId, [otherUserId]),
    ]);

    return {
      messages: { items: items.map(serializeMessage), nextCursor, hasNextPage },
      otherUser,
      otherUserPresence,
      otherUserLastReadAt: otherRead?.lastReadAt.toISOString() ?? null,
    };
  }

  async sendMessage(userId: string, conversationId: string, { type, content }: SendMessageDto) {
    const conversation = await this.getParticipantConversation(userId, conversationId);

    const otherUserId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;

    if (!otherUserId || !(await this.areFriends(userId, otherUserId))) {
      throw new AppException(ERROR_CODES.CHAT_NOT_FRIENDS);
    }

    const now = new Date();

    const [message] = await this.databaseService.$transaction([
      this.databaseService.message.create({ data: { conversationId, senderId: userId, type, content } }),
      this.databaseService.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } }),
      this.databaseService.conversationRead.upsert({
        where: { conversationId_userId: { conversationId, userId } },
        create: { conversationId, userId, lastReadAt: now },
        update: { lastReadAt: now },
      }),
    ]);

    this.chatGateway.emitToUsers([userId, otherUserId], CHAT_EVENTS.messageNew, serializeMessage(message));
    this.chatGateway.emitToAdmins(CHAT_EVENTS.adminMessageNew, serializeAdminMessage(message));

    return serializeMessage(message);
  }

  async deleteMessageAsAuthor(userId: string, messageId: string) {
    const message = await this.databaseService.message.findUnique({ where: { id: messageId } });

    if (!message || message.senderId !== userId) {
      throw new AppException(ERROR_CODES.MESSAGE_NOT_FOUND);
    }

    const record = await this.softDeleteMessage(message, MessageDeletedBy.Author, userId);

    return serializeMessage(record);
  }

  async deleteMessageAsAdmin(adminId: string, messageId: string) {
    const message = await this.databaseService.message.findUnique({ where: { id: messageId } });

    if (!message) {
      throw new AppException(ERROR_CODES.MESSAGE_NOT_FOUND);
    }

    const record = await this.softDeleteMessage(message, MessageDeletedBy.Admin, adminId);

    return serializeAdminMessage(record);
  }

  async markAsRead(userId: string, conversationId: string) {
    await this.getParticipantConversation(userId, conversationId);

    const lastReadAt = new Date();

    const conversation = await this.databaseService.conversation.findUniqueOrThrow({ where: { id: conversationId } });

    await this.databaseService.conversationRead.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      create: { conversationId, userId, lastReadAt },
      update: { lastReadAt },
    });

    this.chatGateway.emitToUsers([conversation.userAId, conversation.userBId], CHAT_EVENTS.conversationRead, {
      conversationId,
      userId,
      lastReadAt,
    });
  }

  async adminListConversations({ search, page, itemsPerPage }: ListAdminConversationsDto) {
    const term = search?.trim();

    const userMatch = term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" as const } },
            { username: { contains: term, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const result = await this.databaseService.offsetPagination({
      model: "conversation",
      page,
      itemsPerPage,
      where: userMatch ? { OR: [{ userA: userMatch }, { userB: userMatch }] } : {},
      orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      include: {
        userA: { select: chatUserSelect },
        userB: { select: chatUserSelect },
        messages: { orderBy: { id: "desc" }, take: 1 },
        _count: { select: { messages: true } },
      },
    });

    const items = result.items.map((conversation: any) => {
      const [lastMessage] = conversation.messages as MessageRecord[];

      return {
        id: conversation.id,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
        userA: conversation.userA,
        userB: conversation.userB,
        messagesCount: conversation._count.messages,
        lastMessage: lastMessage ? serializeAdminMessage(lastMessage) : null,
      };
    });

    return { ...result, items };
  }

  async adminListMessages(conversationId: string, { cursor, limit }: ListMessagesDto) {
    const conversation = await this.databaseService.conversation.findUnique({
      where: { id: conversationId },
      include: { userA: { select: chatUserSelect }, userB: { select: chatUserSelect } },
    });

    if (!conversation) {
      throw new AppException(ERROR_CODES.CONVERSATION_NOT_FOUND);
    }

    const { items, nextCursor, hasNextPage } = await this.findMessagesPage(conversationId, cursor, limit);

    return {
      conversation: {
        id: conversation.id,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
        userA: conversation.userA,
        userB: conversation.userB,
      },
      messages: { items: items.map(serializeAdminMessage), nextCursor, hasNextPage },
    };
  }

  private async softDeleteMessage(message: MessageRecord, deletedBy: MessageDeletedBy, deletedByUserId: string) {
    if (message.deletedAt) {
      throw new AppException(ERROR_CODES.MESSAGE_ALREADY_DELETED);
    }

    const updated = await this.databaseService.message.update({
      where: { id: message.id },
      data: { deletedAt: new Date(), deletedBy, deletedByUserId },
      include: { conversation: { select: { userAId: true, userBId: true } } },
    });

    const { conversation, ...record } = updated;

    this.chatGateway.emitToUsers(
      [conversation.userAId, conversation.userBId],
      CHAT_EVENTS.messageDeleted,
      serializeMessage(record),
    );
    this.chatGateway.emitToAdmins(CHAT_EVENTS.adminMessageDeleted, serializeAdminMessage(record));

    return record;
  }

  private async getOtherUserPresences(viewerId: string, otherUserIds: (string | null)[]): Promise<PresenceState[]> {
    const presences = await this.presenceService.getPresences(
      viewerId,
      otherUserIds.filter((id): id is string => !!id),
    );

    return otherUserIds.map((id) => (id ? (presences[id] ?? { hidden: true }) : { hidden: true }));
  }

  private async getParticipantConversation(userId: string, conversationId: string) {
    const conversation = await this.databaseService.conversation.findUnique({ where: { id: conversationId } });

    if (!conversation || (conversation.userAId !== userId && conversation.userBId !== userId)) {
      throw new AppException(ERROR_CODES.CONVERSATION_NOT_FOUND);
    }

    return conversation;
  }

  private async findMessagesPage(conversationId: string, cursor?: string, limit = DEFAULT_MESSAGES_LIMIT) {
    const data = await this.databaseService.message.findMany({
      where: { conversationId },
      orderBy: { id: "desc" },
      take: limit + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });

    const hasNextPage = data.length > limit;
    const items = hasNextPage ? data.slice(0, limit) : data;
    const nextCursor = hasNextPage ? items[items.length - 1].id : null;

    return { items, nextCursor, hasNextPage };
  }
}
