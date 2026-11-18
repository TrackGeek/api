import { randomUUID } from "node:crypto";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { CacheService } from "@/shared/infra/cache/cache.service";
import { DatabaseService } from "@/shared/infra/database/database.service";
import {
  CHAT_EVENTS,
  chatUserRoom,
  MAX_PRESENCE_IDS_PER_CALL,
  MAX_PRESENCE_WATCH_ROOMS,
  PRESENCE_INSTANCE_TTL_SECONDS,
  PRESENCE_TTL_SECONDS,
  presenceInstanceKey,
  presenceKey,
  presenceWatchRoom,
} from "../chat.constants";
import { ChatGateway } from "../gateway/chat.gateway";

export type PresenceStatus = "online" | "away" | "offline";

export type PresenceState = { status: PresenceStatus; lastSeenAt: string | null } | { hidden: true };

type PresenceFields = Record<string, string>;

const HIDDEN: PresenceState = { hidden: true };

@Injectable()
export class PresenceService {
  readonly instanceId = randomUUID();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  async touchInstance() {
    await this.cacheService.redis.set(presenceInstanceKey(this.instanceId), "1", { EX: PRESENCE_INSTANCE_TTL_SECONDS });
  }

  async removeInstance() {
    await this.cacheService.redis.del(presenceInstanceKey(this.instanceId));
  }

  async connect(userId: string, socketId: string, active: boolean) {
    await this.mutate(userId, (multi, key) => multi.hSet(key, socketId, this.encodeField(active)));
  }

  async setActivity(userId: string, socketId: string, active: boolean) {
    await this.mutate(userId, (multi, key) => multi.hSet(key, socketId, this.encodeField(active)));
  }

  async disconnect(userId: string, socketId: string) {
    await this.mutate(userId, (multi, key) => multi.hDel(key, socketId));
  }

  async getPresences(viewerId: string, userIds: string[]): Promise<Record<string, PresenceState>> {
    const ids = [...new Set(userIds)];

    if (ids.length === 0) return {};

    const users = await this.databaseService.user.findMany({
      where: { id: { in: [...new Set([viewerId, ...ids])] } },
      select: { id: true, chatLastSeenAt: true, profile: { select: { showChatPresence: true } } },
    });

    const byId = new Map(users.map((user) => [user.id, user]));
    const viewerVisible = byId.get(viewerId)?.profile?.showChatPresence ?? false;

    const visibleIds = ids.filter((id) => {
      const user = byId.get(id);

      if (!user?.profile) return false;

      return id === viewerId || (viewerVisible && user.profile.showChatPresence);
    });

    const result: Record<string, PresenceState> = {};

    for (const id of ids) result[id] = HIDDEN;

    if (visibleIds.length === 0) return result;

    const records = await this.readFields(visibleIds);
    const alive = await this.loadAliveInstances(records);

    const staleWrites: Promise<unknown>[] = [];

    visibleIds.forEach((id, index) => {
      const { status, deadSocketIds } = this.computeStatus(records[index], alive);

      if (deadSocketIds.length > 0) {
        staleWrites.push(this.cacheService.redis.hDel(presenceKey(id), deadSocketIds));
      }

      result[id] = this.buildState(status, byId.get(id)!.chatLastSeenAt);
    });

    await Promise.all(staleWrites);

    return result;
  }

  parseUserIds(raw: unknown): string[] | null {
    if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_PRESENCE_IDS_PER_CALL) return null;

    if (!raw.every((id) => typeof id === "string" && id.length > 0 && id.length <= 128)) return null;

    return [...new Set(raw as string[])];
  }

  async prepareSubscription(viewerId: string, raw: unknown, joinedRooms: ReadonlySet<string>) {
    const userIds = this.parseUserIds(raw);

    if (!userIds) return null;

    const newRooms = userIds.filter((id) => !joinedRooms.has(presenceWatchRoom(id)));
    const joinedWatchRooms = [...joinedRooms].filter((room) => room.startsWith(presenceWatchRoom(""))).length;

    if (joinedWatchRooms + newRooms.length > MAX_PRESENCE_WATCH_ROOMS) return null;

    const viewer = await this.databaseService.profile.findUnique({
      where: { userId: viewerId },
      select: { showChatPresence: true },
    });

    if (!viewer?.showChatPresence) return null;

    const presences = await this.getPresences(viewerId, userIds);

    return { userIds, presences };
  }

  async handleToggle(userId: string, enabled: boolean) {
    const watchRoom = presenceWatchRoom(userId);

    if (!enabled) {
      this.chatGateway.emitToRooms([watchRoom], CHAT_EVENTS.presenceUpdate, { userId, hidden: true });
      await this.chatGateway.leaveWatchRooms(userId);
      return;
    }

    const presences = await this.getPresences(userId, [userId]);

    this.chatGateway.emitToRooms([watchRoom], CHAT_EVENTS.presenceUpdate, { userId, ...presences[userId] });
  }

  private encodeField(active: boolean) {
    return `${this.instanceId}:${active ? 1 : 0}`;
  }

  private async mutate(userId: string, apply: (multi: any, key: string) => unknown) {
    const key = presenceKey(userId);
    const multi = this.cacheService.redis.multi();

    multi.hGetAll(key);
    apply(multi, key);
    multi.hGetAll(key);
    multi.expire(key, PRESENCE_TTL_SECONDS);

    const results = (await multi.exec()) as unknown[];
    const before = (results[0] ?? {}) as PresenceFields;
    const after = (results[2] ?? {}) as PresenceFields;

    const alive = await this.loadAliveInstances([before, after]);
    const previousStatus = this.computeStatus(before, alive).status;
    const currentStatus = this.computeStatus(after, alive).status;

    if (previousStatus === currentStatus) return;

    await this.onStatusChange(userId, previousStatus, currentStatus);
  }

  private async onStatusChange(userId: string, previousStatus: PresenceStatus, currentStatus: PresenceStatus) {
    const select = { chatLastSeenAt: true, profile: { select: { showChatPresence: true } } } as const;

    const user =
      previousStatus === "online"
        ? await this.databaseService.user.update({
            where: { id: userId },
            data: { chatLastSeenAt: new Date() },
            select,
          })
        : await this.databaseService.user.findUnique({ where: { id: userId }, select });

    if (!user) return;

    const payload = { userId, ...this.buildState(currentStatus, user.chatLastSeenAt) };

    const rooms = [chatUserRoom(userId), ...(user.profile?.showChatPresence ? [presenceWatchRoom(userId)] : [])];

    this.chatGateway.emitToRooms(rooms, CHAT_EVENTS.presenceUpdate, payload);
  }

  private buildState(status: PresenceStatus, chatLastSeenAt: Date | null): PresenceState {
    return { status, lastSeenAt: status === "online" ? null : (chatLastSeenAt?.toISOString() ?? null) };
  }

  private async readFields(userIds: string[]): Promise<PresenceFields[]> {
    const multi = this.cacheService.redis.multi();

    for (const id of userIds) multi.hGetAll(presenceKey(id));

    const results = (await multi.exec()) as unknown[];

    return results.map((fields) => (fields ?? {}) as PresenceFields);
  }

  private async loadAliveInstances(records: PresenceFields[]) {
    const instanceIds = new Set<string>();

    for (const fields of records) {
      for (const value of Object.values(fields)) instanceIds.add(this.parseField(value).instanceId);
    }

    const alive = new Set<string>();

    if (instanceIds.size === 0) return alive;

    const ids = [...instanceIds];
    const heartbeats = await this.cacheService.redis.mGet(ids.map(presenceInstanceKey));

    ids.forEach((id, index) => {
      if (id === this.instanceId || heartbeats[index]) alive.add(id);
    });

    return alive;
  }

  private parseField(value: string) {
    const separator = value.lastIndexOf(":");

    return { instanceId: value.slice(0, separator), active: value.slice(separator + 1) === "1" };
  }

  private computeStatus(fields: PresenceFields, alive: ReadonlySet<string>) {
    let status: PresenceStatus = "offline";
    const deadSocketIds: string[] = [];

    for (const [socketId, value] of Object.entries(fields)) {
      const { instanceId, active } = this.parseField(value);

      if (!alive.has(instanceId)) {
        deadSocketIds.push(socketId);
        continue;
      }

      if (active) status = "online";
      else if (status === "offline") status = "away";
    }

    return { status, deadSocketIds };
  }
}
