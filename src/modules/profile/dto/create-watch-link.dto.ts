import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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

export class CreateWatchLinkDto {
  readonly userId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @ApiProperty({
    description: "Label shown on the watch button",
    example: "Stremio",
    type: "string",
  })
  readonly label: string;

  @IsWatchLinkUrl()
  @ApiProperty({
    description: "URL template, may contain %VARIABLES%",
    example: "stremio://detail/movie/%ID_IMDB%",
    type: "string",
  })
  readonly url: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(WATCH_LINK_CONTENT_TYPES, { each: true })
  @ApiProperty({
    description: "Content types the link is shown on",
    enum: WATCH_LINK_CONTENT_TYPES,
    isArray: true,
  })
  readonly contentTypes: ContentType[];

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: "boolean", default: true })
  readonly enabled?: boolean;
}
