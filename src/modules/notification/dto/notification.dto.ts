import { ApiProperty } from "@nestjs/swagger";
import { NotificationType } from "@prisma/generated/enums";
import { ArrayNotEmpty, IsArray, IsEnum, IsNotEmpty, IsObject, IsUUID } from "class-validator";

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

export class CreateProgressionNotificationDto {
  @IsNotEmpty()
  @IsUUID("7")
  @ApiProperty({ type: "string", format: "uuid" })
  readonly recipientId: string;

  @IsEnum(NotificationType)
  @IsNotEmpty()
  @ApiProperty({ enum: [NotificationType.LevelUp, NotificationType.MissionCompleted] })
  readonly type: typeof NotificationType.LevelUp | typeof NotificationType.MissionCompleted;

  @IsObject()
  @IsNotEmpty()
  @ApiProperty({ type: "object", additionalProperties: true })
  readonly metadata: SystemNotificationMetadata;
}
