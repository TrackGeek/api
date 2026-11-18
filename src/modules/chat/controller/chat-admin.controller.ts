import { Controller, Delete, Get, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/generated/enums";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { Roles } from "@/shared/decorators/roles.decorator";
import { RolesGuard } from "@/shared/guards/roles.guard";
import { ListAdminConversationsDto } from "../dto/list-admin-conversations.dto";
import { ListMessagesDto } from "../dto/list-messages.dto";
import { ChatService } from "../service/chat.service";

@ApiTags("Chat")
@Controller("/admin/chat")
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Administrator)
export class ChatAdminController {
  constructor(private readonly chatService: ChatService) {}

  @Get("/conversations")
  async listConversations(@Query() query: ListAdminConversationsDto) {
    const conversations = await this.chatService.adminListConversations(query);

    return { conversations };
  }

  @Get("/conversations/:conversationId/messages")
  async listMessages(
    @Param("conversationId", new ParseUUIDPipe()) conversationId: string,
    @Query() query: ListMessagesDto,
  ) {
    return this.chatService.adminListMessages(conversationId, query);
  }

  @Delete("/messages/:messageId")
  async deleteMessage(@Session() session: UserSession, @Param("messageId", new ParseUUIDPipe()) messageId: string) {
    const message = await this.chatService.deleteMessageAsAdmin(session.user.id, messageId);

    return { message };
  }
}
