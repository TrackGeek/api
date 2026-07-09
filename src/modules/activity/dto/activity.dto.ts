import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ActivityType } from "@prisma/generated/enums";
import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from "class-validator";

export interface ActivityMetadata {
  readonly id: string;
  readonly [key: string]: any;
}

export class CreateActivityDto {
  @IsEnum(ActivityType)
  @IsNotEmpty()
  @ApiProperty({ enum: ActivityType })
  readonly type: ActivityType;

  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ type: "string", format: "uuid" })
  readonly userId: string;

  @IsOptional()
  @IsUUID("7")
  readonly listId?: string;

  @IsOptional()
  @IsUUID("7")
  readonly listItemId?: string;

  @IsOptional()
  @IsUUID("7")
  readonly favoriteId?: string;

  @IsOptional()
  @IsUUID("7")
  readonly animeReviewId?: string;

  @IsOptional()
  @IsUUID("7")
  readonly mangaReviewId?: string;

  @IsOptional()
  @IsUUID("7")
  readonly tvShowReviewId?: string;

  @IsOptional()
  @IsUUID("7")
  readonly movieReviewId?: string;

  @IsOptional()
  @IsUUID("7")
  readonly gameReviewId?: string;

  @IsOptional()
  @IsUUID("7")
  readonly bookReviewId?: string;

  @IsOptional()
  @IsUUID("7")
  readonly animeProgressId?: string;

  @IsOptional()
  @IsUUID("7")
  readonly mangaProgressId?: string;

  @IsOptional()
  @IsUUID("7")
  readonly tvShowProgressId?: string;

  @IsOptional()
  @IsUUID("7")
  readonly movieProgressId?: string;

  @IsOptional()
  @IsUUID("7")
  readonly gameProgressId?: string;

  @IsOptional()
  @IsUUID("7")
  readonly bookProgressId?: string;

  @IsOptional()
  @IsUUID("7")
  readonly animeEpisodeWatchId?: string;

  @IsOptional()
  @IsUUID("7")
  readonly tvShowEpisodeWatchId?: string;

  @IsOptional()
  @IsUUID("7")
  readonly followingId?: string;

  @IsOptional()
  @IsUUID("7")
  readonly userMedalId?: string;

  @IsOptional()
  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  readonly metadata?: ActivityMetadata;
}
