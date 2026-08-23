import { ApiPropertyOptional } from "@nestjs/swagger";
import { ContentType } from "@prisma/generated/enums";
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { WATCH_LINK_CONTENT_TYPES } from "@/shared/constants/watch-link";
import { IsWatchLinkUrl } from "@/shared/validators/is-watch-link-url.validator";

export class UpdateWatchLinkDto {
  readonly userId: string;

  readonly linkId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @ApiPropertyOptional({ type: "string", example: "Stremio" })
  readonly label?: string;

  @IsOptional()
  @IsWatchLinkUrl()
  @ApiPropertyOptional({ type: "string", example: "stremio://detail/series/%ID_IMDB%/%ID_IMDB%:%SEASON%:%EPISODE%" })
  readonly url?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(WATCH_LINK_CONTENT_TYPES, { each: true })
  @ApiPropertyOptional({ enum: WATCH_LINK_CONTENT_TYPES, isArray: true })
  readonly contentTypes?: ContentType[];

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: "boolean" })
  readonly enabled?: boolean;
}
