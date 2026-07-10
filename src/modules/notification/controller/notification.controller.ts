import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { GetNotificationsDto } from "../dto/get-notifications.dto";
import { UpdateNotificationPreferencesDto } from "../dto/notification-preference.dto";
import { NotificationService } from "../service/notification.service";

// Literal paths are declared before `/:notificationId`, otherwise Nest matches "read"/"unread" as
// the param and ParseUUIDPipe rejects the request.
@ApiTags("Notification")
@Controller("/notifications")
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get("/")
  async getNotifications(@Session() session: UserSession, @Query() query: GetNotificationsDto) {
    const notifications = await this.notificationService.getNotifications({
      ...query,
      userId: session.user.id,
    });

    return { notifications };
  }

  @Get("/unread/count")
  async getUnreadCount(@Session() session: UserSession) {
    const count = await this.notificationService.getUnreadCount(session.user.id);

    return { count };
  }

  @Get("/preferences")
  async getPreferences(@Session() session: UserSession) {
    const preferences = await this.notificationService.getPreferences(session.user.id);

    return { preferences };
  }

  @Patch("/preferences")
  async updatePreferences(@Session() session: UserSession, @Body() body: UpdateNotificationPreferencesDto) {
    const preferences = await this.notificationService.updatePreferences(session.user.id, body);

    return { preferences };
  }

  @Post("/read/all")
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsRead(@Session() session: UserSession) {
    await this.notificationService.markAllAsRead(session.user.id);
  }

  @Delete("/read/all")
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsUnread(@Session() session: UserSession) {
    await this.notificationService.markAllAsUnread(session.user.id);
  }

  @Delete("/all")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAllNotifications(@Session() session: UserSession) {
    await this.notificationService.deleteAllNotifications(session.user.id);
  }

  @Post("/:notificationId/read")
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(
    @Session() session: UserSession,
    @Param("notificationId", new ParseUUIDPipe()) notificationId: string,
  ) {
    await this.notificationService.markAsRead(session.user.id, notificationId);
  }

  @Delete("/:notificationId/read")
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsUnread(
    @Session() session: UserSession,
    @Param("notificationId", new ParseUUIDPipe()) notificationId: string,
  ) {
    await this.notificationService.markAsUnread(session.user.id, notificationId);
  }

  @Delete("/:notificationId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(
    @Session() session: UserSession,
    @Param("notificationId", new ParseUUIDPipe()) notificationId: string,
  ) {
    await this.notificationService.deleteNotification(session.user.id, notificationId);
  }
}
