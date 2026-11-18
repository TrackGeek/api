import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PresenceService } from "@/modules/chat/service/presence.service";

type Hashes = Map<string, Record<string, string>>;

const hashes: Hashes = new Map();
const liveInstances = new Set<string>();

const mockUserFindMany = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockProfileFindUnique = vi.fn();
const mockHDel = vi.fn(async (key: string, fields: string[]) => {
  const hash = hashes.get(key) ?? {};
  for (const field of fields) delete hash[field];
  return fields.length;
});

function createMulti() {
  const operations: (() => unknown)[] = [];
  const multi = {
    hGetAll: (key: string) => {
      operations.push(() => ({ ...(hashes.get(key) ?? {}) }));
      return multi;
    },
    hSet: (key: string, field: string, value: string) => {
      operations.push(() => {
        hashes.set(key, { ...(hashes.get(key) ?? {}), [field]: value });
        return 1;
      });
      return multi;
    },
    hDel: (key: string, field: string) => {
      operations.push(() => {
        const hash = { ...(hashes.get(key) ?? {}) };
        delete hash[field];
        hashes.set(key, hash);
        return 1;
      });
      return multi;
    },
    expire: () => {
      operations.push(() => 1);
      return multi;
    },
    exec: async () => operations.map((operation) => operation()),
  };
  return multi;
}

const mockRedis = {
  multi: createMulti,
  hDel: mockHDel,
  set: vi.fn(),
  del: vi.fn(),
  mGet: vi.fn(async (keys: string[]) =>
    keys.map((key) => (liveInstances.has(key.replace("presence:instance:", "")) ? "1" : null)),
  ),
};

const mockGateway = { emitToRooms: vi.fn(), leaveWatchRooms: vi.fn() };

const mockDatabaseService = {
  user: { findMany: mockUserFindMany, findUnique: mockUserFindUnique, update: mockUserUpdate },
  profile: { findUnique: mockProfileFindUnique },
};

const DEAD_INSTANCE = "dead-instance";

describe("PresenceService", () => {
  let service: PresenceService;

  const viewerId = faker.string.uuid();
  const targetId = faker.string.uuid();

  const seed = (userId: string, fields: Record<string, string>) => hashes.set(`presence:${userId}`, fields);

  const mockUsers = (viewerOn: boolean, targetOn: boolean, lastSeen: Date | null = null) =>
    mockUserFindMany.mockResolvedValue([
      { id: viewerId, chatLastSeenAt: null, profile: { showChatPresence: viewerOn } },
      { id: targetId, chatLastSeenAt: lastSeen, profile: { showChatPresence: targetOn } },
    ]);

  beforeEach(() => {
    vi.clearAllMocks();
    hashes.clear();
    liveInstances.clear();
    service = new PresenceService(mockDatabaseService as any, { redis: mockRedis } as any, mockGateway as any);
    liveInstances.add(service.instanceId);
    mockUserUpdate.mockImplementation(async ({ data }) => ({
      chatLastSeenAt: data.chatLastSeenAt,
      profile: { showChatPresence: true },
    }));
    mockUserFindUnique.mockResolvedValue({ chatLastSeenAt: null, profile: { showChatPresence: true } });
  });

  describe("status matrix", () => {
    const read = async () => (await service.getPresences(viewerId, [targetId]))[targetId];

    beforeEach(() => mockUsers(true, true));

    it("is offline with no sockets", async () => {
      expect(await read()).toEqual({ status: "offline", lastSeenAt: null });
    });

    it("is online when any live socket is active", async () => {
      seed(targetId, { a: `${service.instanceId}:0`, b: `${service.instanceId}:1` });

      expect(await read()).toEqual({ status: "online", lastSeenAt: null });
    });

    it("is away when live sockets are all inactive", async () => {
      mockUsers(true, true, new Date("2026-01-01T00:00:00.000Z"));
      seed(targetId, { a: `${service.instanceId}:0` });

      expect(await read()).toEqual({ status: "away", lastSeenAt: "2026-01-01T00:00:00.000Z" });
    });

    it("ignores sockets of dead instances and lazily removes them", async () => {
      seed(targetId, { ghost: `${DEAD_INSTANCE}:1` });

      expect(await read()).toEqual({ status: "offline", lastSeenAt: null });
      expect(mockHDel).toHaveBeenCalledWith(`presence:${targetId}`, ["ghost"]);
    });

    it("counts sockets of another live instance", async () => {
      liveInstances.add("other-instance");
      seed(targetId, { ghost: `${DEAD_INSTANCE}:1`, remote: "other-instance:1" });

      expect(await read()).toEqual({ status: "online", lastSeenAt: null });
    });
  });

  describe("hidden rules", () => {
    it.each([
      [true, true, false],
      [true, false, true],
      [false, true, true],
      [false, false, true],
    ])("viewer=%s target=%s hidden=%s", async (viewerOn, targetOn, hidden) => {
      mockUsers(viewerOn, targetOn);

      const presence = (await service.getPresences(viewerId, [targetId]))[targetId];

      expect("hidden" in presence).toBe(hidden);
    });

    it("self is never hidden", async () => {
      mockUserFindMany.mockResolvedValue([
        { id: viewerId, chatLastSeenAt: null, profile: { showChatPresence: false } },
      ]);
      seed(viewerId, { a: `${service.instanceId}:1` });

      expect((await service.getPresences(viewerId, [viewerId]))[viewerId]).toEqual({
        status: "online",
        lastSeenAt: null,
      });
    });

    it("does not require friendship and hides unknown users", async () => {
      mockUsers(true, true);

      const presences = await service.getPresences(viewerId, [targetId, faker.string.uuid()]);

      expect(Object.values(presences)).toEqual([{ status: "offline", lastSeenAt: null }, { hidden: true }]);
    });
  });

  describe("transitions", () => {
    it("offline to online broadcasts without persisting lastSeen", async () => {
      await service.connect(targetId, "s1", true);

      expect(mockUserUpdate).not.toHaveBeenCalled();
      expect(mockGateway.emitToRooms).toHaveBeenCalledWith(
        [`user:${targetId}`, `presence:watch:${targetId}`],
        "presence:update",
        { userId: targetId, status: "online", lastSeenAt: null },
      );
    });

    it("connecting inactive goes offline to away without persisting", async () => {
      await service.connect(targetId, "s1", false);

      expect(mockUserUpdate).not.toHaveBeenCalled();
      expect(mockGateway.emitToRooms).toHaveBeenCalledWith(
        expect.any(Array),
        "presence:update",
        expect.objectContaining({ status: "away" }),
      );
    });

    it("online to away persists lastSeen", async () => {
      await service.connect(targetId, "s1", true);
      mockGateway.emitToRooms.mockClear();

      await service.setActivity(targetId, "s1", false);

      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: { chatLastSeenAt: expect.any(Date) } }),
      );
      expect(mockGateway.emitToRooms).toHaveBeenCalledWith(
        expect.any(Array),
        "presence:update",
        expect.objectContaining({ status: "away", lastSeenAt: expect.any(String) }),
      );
    });

    it("away to offline does not overwrite lastSeen", async () => {
      await service.connect(targetId, "s1", false);
      mockGateway.emitToRooms.mockClear();

      await service.disconnect(targetId, "s1");

      expect(mockUserUpdate).not.toHaveBeenCalled();
      expect(mockGateway.emitToRooms).toHaveBeenCalledWith(
        expect.any(Array),
        "presence:update",
        expect.objectContaining({ status: "offline" }),
      );
    });

    it("online to offline persists lastSeen", async () => {
      await service.connect(targetId, "s1", true);

      await service.disconnect(targetId, "s1");

      expect(mockUserUpdate).toHaveBeenCalledTimes(1);
    });

    it("no status change does not broadcast", async () => {
      await service.connect(targetId, "s1", true);
      mockGateway.emitToRooms.mockClear();

      await service.connect(targetId, "s2", false);
      await service.setActivity(targetId, "s2", true);
      await service.disconnect(targetId, "s2");

      expect(mockGateway.emitToRooms).not.toHaveBeenCalled();
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("owner with toggle off only notifies own room", async () => {
      mockUserFindUnique.mockResolvedValue({ chatLastSeenAt: null, profile: { showChatPresence: false } });

      await service.connect(targetId, "s1", true);

      expect(mockGateway.emitToRooms).toHaveBeenCalledWith([`user:${targetId}`], "presence:update", expect.any(Object));
    });
  });

  describe("subscription", () => {
    const ids = (count: number) => Array.from({ length: count }, () => faker.string.uuid());

    it("rejects more than 100 ids", async () => {
      expect(await service.prepareSubscription(viewerId, ids(101), new Set())).toBeNull();
      expect(mockProfileFindUnique).not.toHaveBeenCalled();
    });

    it("rejects invalid payloads", async () => {
      expect(await service.prepareSubscription(viewerId, "x", new Set())).toBeNull();
      expect(await service.prepareSubscription(viewerId, [], new Set())).toBeNull();
      expect(await service.prepareSubscription(viewerId, [1, 2], new Set())).toBeNull();
    });

    it("rejects when exceeding 300 watch rooms", async () => {
      const joined = new Set(ids(299).map((id) => `presence:watch:${id}`));

      expect(await service.prepareSubscription(viewerId, ids(2), joined)).toBeNull();
    });

    it("accepts up to 100 ids and returns presences", async () => {
      mockProfileFindUnique.mockResolvedValue({ showChatPresence: true });
      mockUsers(true, true);

      const result = await service.prepareSubscription(viewerId, [targetId], new Set());

      expect(result?.userIds).toEqual([targetId]);
      expect(result?.presences[targetId]).toEqual({ status: "offline", lastSeenAt: null });
    });

    it("refuses silently when viewer toggle is off", async () => {
      mockProfileFindUnique.mockResolvedValue({ showChatPresence: false });

      expect(await service.prepareSubscription(viewerId, [targetId], new Set())).toBeNull();
      expect(mockUserFindMany).not.toHaveBeenCalled();
    });
  });

  describe("handleToggle", () => {
    it("turning off emits hidden to watch room and leaves watch rooms", async () => {
      await service.handleToggle(viewerId, false);

      expect(mockGateway.emitToRooms).toHaveBeenCalledWith([`presence:watch:${viewerId}`], "presence:update", {
        userId: viewerId,
        hidden: true,
      });
      expect(mockGateway.leaveWatchRooms).toHaveBeenCalledWith(viewerId);
    });

    it("turning on emits current state to watch room", async () => {
      mockUserFindMany.mockResolvedValue([{ id: viewerId, chatLastSeenAt: null, profile: { showChatPresence: true } }]);
      seed(viewerId, { a: `${service.instanceId}:1` });

      await service.handleToggle(viewerId, true);

      expect(mockGateway.emitToRooms).toHaveBeenCalledWith([`presence:watch:${viewerId}`], "presence:update", {
        userId: viewerId,
        status: "online",
        lastSeenAt: null,
      });
    });
  });
});
