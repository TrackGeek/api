import { faker } from "@faker-js/faker";
import { MessageDeletedBy, MessageType } from "@prisma/generated/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatService } from "@/modules/chat/service/chat.service";

const mockFollowingCount = vi.fn();
const mockConversationUpsert = vi.fn();
const mockConversationFindUnique = vi.fn();
const mockMessageFindUnique = vi.fn();
const mockMessageUpdate = vi.fn();
const mockMessageFindMany = vi.fn();
const mockMessageCreate = vi.fn();
const mockTransaction = vi.fn();
const mockConversationReadFindUnique = vi.fn();
const mockUserFindUnique = vi.fn();
const mockFollowingFindMany = vi.fn();
const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();
const mockPresenceService = { getPresences: vi.fn() };

const mockDatabaseService = {
  following: { count: mockFollowingCount, findMany: mockFollowingFindMany },
  user: { findUnique: mockUserFindUnique },
  conversation: { upsert: mockConversationUpsert, findUnique: mockConversationFindUnique, update: vi.fn() },
  conversationRead: { upsert: vi.fn(), findUnique: mockConversationReadFindUnique },
  message: {
    findUnique: mockMessageFindUnique,
    update: mockMessageUpdate,
    findMany: mockMessageFindMany,
    create: mockMessageCreate,
  },
  $transaction: mockTransaction,
};

const mockGateway = { emitToUsers: vi.fn(), emitToAdmins: vi.fn() };

const mockCache = { get: mockCacheGet, set: mockCacheSet };

function buildMessage(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: faker.string.uuid(),
    conversationId: faker.string.uuid(),
    senderId: faker.string.uuid(),
    type: MessageType.Text,
    content: faker.lorem.sentence(),
    deletedAt: null,
    deletedBy: null,
    deletedByUserId: null,
    createdAt: new Date(),
    ...overrides,
  } as any;
}

describe("ChatService", () => {
  let service: ChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPresenceService.getPresences.mockResolvedValue({});
    mockUserFindUnique.mockResolvedValue(null);
    mockFollowingFindMany.mockResolvedValue([]);
    service = new ChatService(
      mockDatabaseService as any,
      mockGateway as any,
      mockCache as any,
      mockPresenceService as any,
    );
  });

  describe("mutual follow", () => {
    it("is friends only when both follow rows exist", async () => {
      mockFollowingCount.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

      expect(await service.areFriends(faker.string.uuid(), faker.string.uuid())).toBe(true);
      expect(await service.areFriends(faker.string.uuid(), faker.string.uuid())).toBe(false);
    });

    it("is never friends with self", async () => {
      const id = faker.string.uuid();

      expect(await service.areFriends(id, id)).toBe(false);
      expect(mockFollowingCount).not.toHaveBeenCalled();
    });

    it("rejects conversation creation without mutual follow", async () => {
      mockFollowingCount.mockResolvedValue(1);

      await expect(service.getOrCreateConversation(faker.string.uuid(), faker.string.uuid())).rejects.toMatchObject({
        status: 403,
      });
      expect(mockConversationUpsert).not.toHaveBeenCalled();
    });

    it("rejects sending when no longer friends", async () => {
      const userId = faker.string.uuid();
      const otherId = faker.string.uuid();
      mockConversationFindUnique.mockResolvedValue({ id: faker.string.uuid(), userAId: userId, userBId: otherId });
      mockFollowingCount.mockResolvedValue(1);

      await expect(
        service.sendMessage(userId, faker.string.uuid(), { type: MessageType.Text, content: "hi" }),
      ).rejects.toMatchObject({ status: 403 });
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it("rejects sending when the other participant was deleted", async () => {
      const userId = faker.string.uuid();
      mockConversationFindUnique.mockResolvedValue({ id: faker.string.uuid(), userAId: userId, userBId: null });

      await expect(
        service.sendMessage(userId, faker.string.uuid(), { type: MessageType.Text, content: "hi" }),
      ).rejects.toMatchObject({ status: 403 });
      expect(mockFollowingCount).not.toHaveBeenCalled();
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it("serializes messages from deleted senders with null senderId", async () => {
      const userId = faker.string.uuid();
      mockConversationFindUnique.mockResolvedValue({ userAId: userId, userBId: null });
      mockMessageFindMany.mockResolvedValue([buildMessage({ senderId: null })]);

      const {
        messages: { items },
      } = await service.listMessages(userId, faker.string.uuid(), {});

      expect(items[0].senderId).toBeNull();
    });

    it("hides conversation from non participants", async () => {
      mockConversationFindUnique.mockResolvedValue({ userAId: faker.string.uuid(), userBId: faker.string.uuid() });

      await expect(service.listMessages(faker.string.uuid(), faker.string.uuid(), {})).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("soft delete", () => {
    it("author soft deletes and never hard deletes", async () => {
      const message = buildMessage();
      const deleted = {
        ...message,
        deletedAt: new Date(),
        deletedBy: MessageDeletedBy.Author,
        deletedByUserId: message.senderId,
        conversation: { userAId: message.senderId, userBId: faker.string.uuid() },
      };
      mockMessageFindUnique.mockResolvedValue(message);
      mockMessageUpdate.mockResolvedValue(deleted);

      const result = await service.deleteMessageAsAuthor(message.senderId, message.id);

      expect(mockMessageUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedBy: MessageDeletedBy.Author, deletedByUserId: message.senderId }),
        }),
      );
      expect(result.content).toBeNull();
      expect(mockGateway.emitToUsers).toHaveBeenCalledWith(
        expect.any(Array),
        "message:deleted",
        expect.objectContaining({ content: null }),
      );
    });

    it("only the author can delete as author", async () => {
      mockMessageFindUnique.mockResolvedValue(buildMessage());

      await expect(service.deleteMessageAsAuthor(faker.string.uuid(), faker.string.uuid())).rejects.toMatchObject({
        status: 404,
      });
      expect(mockMessageUpdate).not.toHaveBeenCalled();
    });

    it("rejects deleting an already deleted message", async () => {
      const message = buildMessage({ deletedAt: new Date(), deletedBy: MessageDeletedBy.Author });
      mockMessageFindUnique.mockResolvedValue(message);

      await expect(service.deleteMessageAsAdmin(faker.string.uuid(), message.id)).rejects.toMatchObject({
        status: 409,
      });
    });

    it("admin delete keeps original content and records who deleted", async () => {
      const adminId = faker.string.uuid();
      const message = buildMessage();
      mockMessageFindUnique.mockResolvedValue(message);
      mockMessageUpdate.mockResolvedValue({
        ...message,
        deletedAt: new Date(),
        deletedBy: MessageDeletedBy.Admin,
        deletedByUserId: adminId,
        conversation: { userAId: message.senderId, userBId: faker.string.uuid() },
      });

      const result = await service.deleteMessageAsAdmin(adminId, message.id);

      expect(result.content).toBe(message.content);
      expect(result.deletedBy).toBe(MessageDeletedBy.Admin);
      expect(result.deletedByUserId).toBe(adminId);
    });
  });

  describe("serialization", () => {
    it("returns null content for deleted messages to participants", async () => {
      const userId = faker.string.uuid();
      const live = buildMessage();
      const deleted = buildMessage({ deletedAt: new Date(), deletedBy: MessageDeletedBy.Admin });
      mockConversationFindUnique.mockResolvedValue({ userAId: userId, userBId: faker.string.uuid() });
      mockMessageFindMany.mockResolvedValue([deleted, live]);

      const {
        messages: { items },
      } = await service.listMessages(userId, faker.string.uuid(), {});

      expect(items[0].content).toBeNull();
      expect(items[0].deletedBy).toBe(MessageDeletedBy.Admin);
      expect(items[1].content).toBe(live.content);
      expect(items[0]).not.toHaveProperty("deletedByUserId");
    });

    it("returns original content for deleted messages to admins", async () => {
      const deleted = buildMessage({ deletedAt: new Date(), deletedBy: MessageDeletedBy.Author });
      mockConversationFindUnique.mockResolvedValue({ id: deleted.conversationId, userA: {}, userB: {} });
      mockMessageFindMany.mockResolvedValue([deleted]);

      const { messages } = await service.adminListMessages(deleted.conversationId, {});

      expect(messages.items[0].content).toBe(deleted.content);
    });

    it("paginates with cursor", async () => {
      const userId = faker.string.uuid();
      const data = [buildMessage(), buildMessage(), buildMessage()];
      mockConversationFindUnique.mockResolvedValue({ userAId: userId, userBId: faker.string.uuid() });
      mockMessageFindMany.mockResolvedValue(data);

      const result = await service.listMessages(userId, faker.string.uuid(), { limit: 2 });

      expect(result.messages.items).toHaveLength(2);
      expect(result.messages.hasNextPage).toBe(true);
      expect(result.messages.nextCursor).toBe(data[1].id);
    });
  });

  describe("otherUserLastReadAt", () => {
    it("returns the other user and presence for a conversation without messages", async () => {
      const userId = faker.string.uuid();
      const otherId = faker.string.uuid();
      const otherUser = {
        id: otherId,
        name: faker.person.fullName(),
        username: faker.internet.username(),
        image: null,
      };
      mockConversationFindUnique.mockResolvedValue({ userAId: userId, userBId: otherId });
      mockMessageFindMany.mockResolvedValue([]);
      mockConversationReadFindUnique.mockResolvedValue(null);
      mockUserFindUnique.mockResolvedValue(otherUser);
      mockPresenceService.getPresences.mockResolvedValue({ [otherId]: { status: "online", lastSeenAt: null } });

      const result = await service.listMessages(userId, faker.string.uuid(), {});

      expect(result.otherUser).toEqual(otherUser);
      expect(result.otherUserPresence).toEqual({ status: "online", lastSeenAt: null });
    });

    it("returns null other user and hidden presence when the other user was deleted", async () => {
      const userId = faker.string.uuid();
      mockConversationFindUnique.mockResolvedValue({ userAId: userId, userBId: null });
      mockMessageFindMany.mockResolvedValue([]);

      const result = await service.listMessages(userId, faker.string.uuid(), {});

      expect(result.otherUser).toBeNull();
      expect(result.otherUserPresence).toEqual({ hidden: true });
    });

    it("returns the other participant read marker", async () => {
      const userId = faker.string.uuid();
      const otherId = faker.string.uuid();
      const lastReadAt = new Date();
      mockConversationFindUnique.mockResolvedValue({ userAId: userId, userBId: otherId });
      mockMessageFindMany.mockResolvedValue([]);
      mockConversationReadFindUnique.mockResolvedValue({ lastReadAt });

      const result = await service.listMessages(userId, faker.string.uuid(), {});

      expect(result.otherUserLastReadAt).toBe(lastReadAt.toISOString());
      expect(mockConversationReadFindUnique).toHaveBeenCalledWith({
        where: { conversationId_userId: expect.objectContaining({ userId: otherId }) },
      });
    });

    it("returns null when the other participant never read", async () => {
      const userId = faker.string.uuid();
      mockConversationFindUnique.mockResolvedValue({ userAId: userId, userBId: faker.string.uuid() });
      mockMessageFindMany.mockResolvedValue([]);
      mockConversationReadFindUnique.mockResolvedValue(null);

      const result = await service.listMessages(userId, faker.string.uuid(), {});

      expect(result.otherUserLastReadAt).toBeNull();
    });
  });

  describe("listFriends", () => {
    it("attaches presence and orders online, away, offline, then name", async () => {
      const userId = faker.string.uuid();
      const build = (name: string) => ({ id: faker.string.uuid(), name, username: name.toLowerCase(), profile: null });
      const [zed, amy, bob, cat] = [build("Zed"), build("Amy"), build("Bob"), build("Cat")];
      mockFollowingFindMany.mockResolvedValue([amy, bob, cat, zed].map((following) => ({ following })));
      mockPresenceService.getPresences.mockResolvedValue({
        [amy.id]: { status: "offline", lastSeenAt: null },
        [bob.id]: { hidden: true },
        [cat.id]: { status: "away", lastSeenAt: null },
        [zed.id]: { status: "online", lastSeenAt: null },
      });

      const friends = await service.listFriends(userId);

      expect(friends.map((friend) => friend.name)).toEqual(["Zed", "Cat", "Amy", "Bob"]);
      expect(friends[0].presence).toEqual({ status: "online", lastSeenAt: null });
    });
  });

  describe("typing", () => {
    const userId = faker.string.uuid();
    const otherId = faker.string.uuid();

    it("returns the other participant for a valid friend conversation", async () => {
      mockCacheGet.mockResolvedValue(null);
      mockConversationFindUnique.mockResolvedValue({ userAId: userId, userBId: otherId });
      mockFollowingCount.mockResolvedValue(2);

      expect(await service.getTypingRecipient(userId, faker.string.uuid())).toBe(otherId);
      expect(mockCacheSet).toHaveBeenCalledWith(expect.stringContaining("members"), [userId, otherId], 600);
    });

    it("uses cached members", async () => {
      mockCacheGet.mockResolvedValue([otherId, userId]);

      expect(await service.getTypingRecipient(userId, faker.string.uuid())).toBe(otherId);
      expect(mockConversationFindUnique).not.toHaveBeenCalled();
    });

    it("rejects non participants", async () => {
      mockCacheGet.mockResolvedValue(null);
      mockConversationFindUnique.mockResolvedValue({ userAId: faker.string.uuid(), userBId: otherId });
      mockFollowingCount.mockResolvedValue(2);

      expect(await service.getTypingRecipient(userId, faker.string.uuid())).toBeNull();
    });

    it("rejects cached conversation for non participants", async () => {
      mockCacheGet.mockResolvedValue([faker.string.uuid(), otherId]);

      expect(await service.getTypingRecipient(userId, faker.string.uuid())).toBeNull();
    });

    it("rejects when no longer friends", async () => {
      mockCacheGet.mockResolvedValue(null);
      mockConversationFindUnique.mockResolvedValue({ userAId: userId, userBId: otherId });
      mockFollowingCount.mockResolvedValue(1);

      expect(await service.getTypingRecipient(userId, faker.string.uuid())).toBeNull();
      expect(mockCacheSet).not.toHaveBeenCalled();
    });

    it("rejects when the other participant was deleted", async () => {
      mockCacheGet.mockResolvedValue(null);
      mockConversationFindUnique.mockResolvedValue({ userAId: userId, userBId: null });

      expect(await service.getTypingRecipient(userId, faker.string.uuid())).toBeNull();
    });
  });
});
