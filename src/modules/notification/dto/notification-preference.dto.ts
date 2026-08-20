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

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: "boolean", description: "Receive notifications when a new episode is released." })
  readonly newEpisode?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: "boolean", description: "Receive notifications when a new chapter is released." })
  readonly newChapter?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: "boolean", description: "Receive notifications when a tracked game releases." })
  readonly gameRelease?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    type: "boolean",
    description: "Receive notifications when a completed title gets new content.",
  })
  readonly reopenedCompleted?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    type: "boolean",
    description: "Receive notifications when a sequel of a finished title lands.",
  })
  readonly sequelAdded?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: "boolean", description: "Receive notifications when you reach a new level." })
  readonly levelUp?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: "boolean", description: "Receive notifications when you complete a mission." })
  readonly mission?: boolean;
}

export interface NotificationPreferences {
  readonly comment: boolean;
  readonly reaction: boolean;
  readonly newEpisode: boolean;
  readonly newChapter: boolean;
  readonly gameRelease: boolean;
  readonly reopenedCompleted: boolean;
  readonly sequelAdded: boolean;
  readonly levelUp: boolean;
  readonly mission: boolean;
}
