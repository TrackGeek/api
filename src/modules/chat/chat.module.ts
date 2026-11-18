import { Module } from "@nestjs/common";
import { ChatController } from "./controller/chat.controller";
import { ChatAdminController } from "./controller/chat-admin.controller";
import { PresenceController } from "./controller/presence.controller";
import { ChatGateway } from "./gateway/chat.gateway";
import { ChatService } from "./service/chat.service";
import { PresenceService } from "./service/presence.service";

@Module({
  imports: [],
  controllers: [ChatController, ChatAdminController, PresenceController],
  providers: [ChatService, PresenceService, ChatGateway],
  exports: [ChatService, PresenceService, ChatGateway],
})
export class ChatModule {}
