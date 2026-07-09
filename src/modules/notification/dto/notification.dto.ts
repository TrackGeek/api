import { ApiProperty } from "@nestjs/swagger";
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsObject, IsUUID } from "class-validator";

// Shape of Notification.metadata when type is System. Kept open on purpose — what the system sends
// is not settled yet, so anything beyond these fields rides along untouched.
//
// Prefer titleKey/descriptionKey: the web app resolves them through i18n at render time, so the
// notification follows the reader's language. The literal title/description are the escape hatch for
// content that has no translation (a one-off announcement, a user-supplied string).
export interface SystemNotificationMetadata {
  readonly title?: string;
  readonly titleKey?: string;
  readonly description?: string;
  readonly descriptionKey?: string;
  readonly url?: string;
  readonly [key: string]: any;
}

export class CreateSystemNotificationDto {
  @IsArray()
  @ArrayNotEmpty()
  @ApiProperty({ type: "array", items: { type: "string" }, description: "Users that receive the notification." })
  readonly recipientIds: string[];

  @IsObject()
  @IsNotEmpty()
  @ApiProperty({ type: "object", additionalProperties: true })
  readonly metadata: SystemNotificationMetadata;
}

export class CreateCommentNotificationDto {
  @IsNotEmpty()
  @IsUUID("7")
  @ApiProperty({ type: "string", format: "uuid" })
  readonly commentId: string;
}

export class CreateReactionNotificationDto {
  @IsNotEmpty()
  @IsUUID("7")
  @ApiProperty({ type: "string", format: "uuid" })
  readonly reactionId: string;
}
