import { ApiPropertyOptional } from "@nestjs/swagger";
import { ContentType } from "@prisma/generated/enums";
import { Transform } from "class-transformer";
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsISO31661Alpha2,
  IsOptional,
  IsString,
} from "class-validator";

export class UpdateProfileDto {
  readonly userId: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: "string" })
  readonly color?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: "string", nullable: true })
  readonly avatarFrame?: string | null;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: "string", nullable: true })
  readonly title?: string | null;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: "string", nullable: true })
  readonly bannerEffect?: string | null;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: "string" })
  readonly language?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: "string" })
  readonly timezone?: string;

  @IsOptional()
  @IsIn(["romaji", "native", "english"])
  @ApiPropertyOptional({ enum: ["romaji", "native", "english"], default: "romaji" })
  readonly animeMangaTitleLanguage?: "romaji" | "native" | "english";

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.toUpperCase() : value))
  @IsISO31661Alpha2()
  @ApiPropertyOptional({ type: "string", example: "BR" })
  readonly watchRegion?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: "string" })
  readonly about?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(ContentType, { each: true })
  @ApiPropertyOptional({ enum: ContentType, isArray: true })
  readonly contentTypes?: ContentType[];

  @IsOptional()
  @IsEnum(ContentType)
  @ApiPropertyOptional({ enum: ContentType, default: ContentType.Movie })
  readonly defaultSearchType?: ContentType;
}
