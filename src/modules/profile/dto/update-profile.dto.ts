import { ApiPropertyOptional } from "@nestjs/swagger";
import { ContentType } from "@prisma/generated/enums";
import { ArrayNotEmpty, ArrayUnique, IsArray, IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateProfileDto {
  readonly userId: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: "string" })
  readonly color?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: "string" })
  readonly language?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: "string" })
  readonly timezone?: string;

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
}
