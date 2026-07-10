import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: "boolean", description: "Receive notifications for comments on your profile." })
  readonly comment?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: "boolean", description: "Receive notifications for reactions to your content." })
  readonly reaction?: boolean;
}

export interface NotificationPreferences {
  readonly comment: boolean;
  readonly reaction: boolean;
}
