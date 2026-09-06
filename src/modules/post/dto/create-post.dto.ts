import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ContentType } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, MaxLength, ValidateIf } from "class-validator";

export const POST_MAX_LENGTH = 20000;

export class CreatePostDto {
  @IsNotEmpty()
  @MaxLength(POST_MAX_LENGTH)
  @ApiProperty({ type: "string", maxLength: POST_MAX_LENGTH })
  readonly content: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: "boolean", default: false })
  readonly isSpoiler?: boolean;

  @ValidateIf((dto: CreatePostDto) => dto.mediaExternalId !== undefined)
  @IsEnum(ContentType)
  @ApiPropertyOptional({ enum: ContentType, description: "Required when mediaExternalId is sent" })
  readonly mediaType?: ContentType;

  @ValidateIf((dto: CreatePostDto) => dto.mediaType !== undefined)
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @ApiPropertyOptional({
    type: "integer",
    description: "Provider id of the attached media (malId, anilistId, tmdbId, igdbId or hardcoverId)",
  })
  readonly mediaExternalId?: number;

  @ApiProperty({ type: "string" })
  readonly userId: string;
}
