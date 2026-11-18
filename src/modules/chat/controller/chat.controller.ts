import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { CreateConversationDto } from "../dto/create-conversation.dto";
import { ListConversationsDto } from "../dto/list-conversations.dto";
import { ListMessagesDto } from "../dto/list-messages.dto";
import { SendMessageDto } from "../dto/send-message.dto";
import { ChatService } from "../service/chat.service";

@ApiTags("Chat")
@Controller("/chat")
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get("/friends")
  async listFriends(@Session() session: UserSession) {
    const friends = await this.chatService.listFriends(session.user.id);

    return { friends };
  }

  @Get("/conversations")
  async listConversations(@Session() session: UserSession, @Query() query: ListConversationsDto) {
    const conversations = await this.chatService.listConversations(session.user.id, query);

    return { conversations };
  }

  @Post("/conversations")
  async createConversation(@Session() session: UserSession, @Body() body: CreateConversationDto) {
    const conversation = await this.chatService.getOrCreateConversation(session.user.id, body.userId);

    return { conversation };
  }

  @Get("/conversations/:conversationId/messages")
  async listMessages(
    @Session() session: UserSession,
    @Param("conversationId", new ParseUUIDPipe()) conversationId: string,
    @Query() query: ListMessagesDto,
  ) {
    return this.chatService.listMessages(session.user.id, conversationId, query);
  }

  @Post("/conversations/:conversationId/messages")
  @Throttle({ write: { limit: 60, ttl: 60_000 } })
  async sendMessage(
    @Session() session: UserSession,
    @Param("conversationId", new ParseUUIDPipe()) conversationId: string,
    @Body() body: SendMessageDto,
  ) {
    const message = await this.chatService.sendMessage(session.user.id, conversationId, body);

    return { message };
  }

  @Delete("/messages/:messageId")
  async deleteMessage(@Session() session: UserSession, @Param("messageId", new ParseUUIDPipe()) messageId: string) {
    const message = await this.chatService.deleteMessageAsAuthor(session.user.id, messageId);

    return { message };
  }

  @Post("/conversations/:conversationId/read")
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(
    @Session() session: UserSession,
    @Param("conversationId", new ParseUUIDPipe()) conversationId: string,
  ) {
    await this.chatService.markAsRead(session.user.id, conversationId);
  }
}
