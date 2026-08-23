import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ContentType, XpReason } from "@prisma/generated/enums";
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class GrantXpDto {
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ type: "string", format: "uuid" })
  readonly userId: string;

  @IsEnum(XpReason)
  @IsNotEmpty()
  @ApiProperty({ enum: XpReason })
  readonly reason: XpReason;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  readonly sourceKey: string;

  @IsOptional()
  @IsEnum(ContentType)
  @ApiPropertyOptional({ enum: ContentType })
  readonly contentType?: ContentType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional()
  readonly amount?: number;

  @IsOptional()
  readonly skipDailyCap?: boolean;

  @IsOptional()
  readonly metadata?: Record<string, any>;
}
