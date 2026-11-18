import { forwardRef, Inject, Logger, type OnModuleDestroy } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { UserRole } from "@prisma/generated/enums";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { fromNodeHeaders } from "better-auth/node";
import type { Server, Socket } from "socket.io";
import {
  CHAT_ADMINS_ROOM,
  CHAT_EVENTS,
  chatUserRoom,
  PRESENCE_HEARTBEAT_INTERVAL_MS,
  PRESENCE_WATCH_PREFIX,
  presenceWatchRoom,
} from "../chat.constants";
import { ChatService } from "../service/chat.service";
import { PresenceService } from "../service/presence.service";

@WebSocketGateway({ namespace: "/chat" })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  private readonly logger = new Logger(ChatGateway.name);

  private heartbeat?: NodeJS.Timeout;

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly auth: AuthService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    @Inject(forwardRef(() => PresenceService))
    private readonly presenceService: PresenceService,
  ) {}

  afterInit() {
    const beat = () =>
      this.presenceService
        .touchInstance()
        .catch((error) => this.logger.warn(`Presence heartbeat failed: ${this.describe(error)}`));

    void beat();

    this.heartbeat = setInterval(beat, PRESENCE_HEARTBEAT_INTERVAL_MS);
  }

  async onModuleDestroy() {
    if (this.heartbeat) clearInterval(this.heartbeat);

    await this.presenceService.removeInstance().catch(() => undefined);
  }

  async handleConnection(client: Socket) {
    try {
      const session = await this.auth.api.getSession({ headers: fromNodeHeaders(client.handshake.headers) });

      if (!session) {
        client.disconnect(true);
        return;
      }

      if (client.disconnected) return;

      await client.join(chatUserRoom(session.user.id));

      if ((session.user as { role?: UserRole }).role === UserRole.Administrator) {
        await client.join(CHAT_ADMINS_ROOM);
      }

      const active = client.handshake.auth?.active;

      await this.presenceService.connect(session.user.id, client.id, typeof active === "boolean" ? active : true);

      client.data.userId = session.user.id;

      if (client.disconnected) {
        await this.handleDisconnect(client);
      }
    } catch (error) {
      this.logger.warn(`Socket authentication failed: ${this.describe(error)}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;

    if (!userId) return;

    try {
      await this.presenceService.disconnect(userId, client.id);
    } catch (error) {
      this.logger.warn(`Presence cleanup failed: ${this.describe(error)}`);
    }
  }

  @SubscribeMessage(CHAT_EVENTS.presenceActivity)
  async handlePresenceActivity(@ConnectedSocket() client: Socket, @MessageBody() body: { active?: unknown }) {
    const userId = client.data.userId as string | undefined;

    if (!userId || typeof body?.active !== "boolean") return;

    try {
      await this.presenceService.setActivity(userId, client.id, body.active);
    } catch (error) {
      this.logger.warn(`Presence activity failed: ${this.describe(error)}`);
    }
  }

  @SubscribeMessage(CHAT_EVENTS.presenceSubscribe)
  async handlePresenceSubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { userIds?: unknown }) {
    const userId = client.data.userId as string | undefined;

    if (!userId) return;

    try {
      const subscription = await this.presenceService.prepareSubscription(userId, body?.userIds, client.rooms);

      if (!subscription) return;

      await client.join(subscription.userIds.map(presenceWatchRoom));

      for (const id of subscription.userIds) {
        client.emit(CHAT_EVENTS.presenceUpdate, { userId: id, ...subscription.presences[id] });
      }
    } catch (error) {
      this.logger.warn(`Presence subscribe failed: ${this.describe(error)}`);
    }
  }

  @SubscribeMessage(CHAT_EVENTS.presenceUnsubscribe)
  async handlePresenceUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { userIds?: unknown }) {
    if (!client.data.userId) return;

    const userIds = this.presenceService.parseUserIds(body?.userIds);

    if (!userIds) return;

    for (const id of userIds) await client.leave(presenceWatchRoom(id));
  }

  async leaveWatchRooms(userId: string) {
    if (!this.server) return;

    const sockets = await this.server.in(chatUserRoom(userId)).fetchSockets();

    for (const socket of sockets) {
      for (const room of socket.rooms) {
        if (room.startsWith(PRESENCE_WATCH_PREFIX)) socket.leave(room);
      }
    }
  }

  emitToRooms(rooms: string[], event: string, payload: unknown) {
    if (!this.server || rooms.length === 0) return;

    this.server.to(rooms).emit(event, payload);
  }

  @SubscribeMessage(CHAT_EVENTS.typingStart)
  async handleTypingStart(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId?: string }) {
    await this.relayTyping(client, body, true);
  }

  @SubscribeMessage(CHAT_EVENTS.typingStop)
  async handleTypingStop(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId?: string }) {
    await this.relayTyping(client, body, false);
  }

  emitToUsers(userIds: (string | null)[], event: string, payload: unknown) {
    const rooms = userIds.filter((userId): userId is string => !!userId).map(chatUserRoom);

    if (!this.server || rooms.length === 0) return;

    this.server.to(rooms).emit(event, payload);
  }

  emitToAdmins(event: string, payload: unknown) {
    if (!this.server) return;

    this.server.to(CHAT_ADMINS_ROOM).emit(event, payload);
  }

  private async relayTyping(client: Socket, body: { conversationId?: string } | undefined, isTyping: boolean) {
    const userId = client.data.userId as string | undefined;
    const conversationId = body?.conversationId;

    if (!userId || typeof conversationId !== "string") return;

    try {
      const recipientId = await this.chatService.getTypingRecipient(userId, conversationId);

      if (!recipientId) return;

      this.emitToUsers([recipientId], CHAT_EVENTS.typing, { conversationId, userId, isTyping });
    } catch (error) {
      this.logger.warn(`Typing relay failed: ${this.describe(error)}`);
    }
  }

  private describe(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
