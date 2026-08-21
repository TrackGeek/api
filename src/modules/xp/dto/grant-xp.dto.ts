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

  // Chave de idempotência. Ver XP_SOURCE_KEYS em shared/constants/xp.ts.
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  readonly sourceKey: string;

  @IsOptional()
  @IsEnum(ContentType)
  @ApiPropertyOptional({ enum: ContentType })
  readonly contentType?: ContentType;

  // Sobrescreve o valor da tabela XP_RULES. Usado por MissionCompleted, cujo
  // valor vem da linha da missão no banco.
  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional()
  readonly amount?: number;

  // Ignora o teto diário. Só o backfill usa.
  @IsOptional()
  readonly skipDailyCap?: boolean;

  @IsOptional()
  readonly metadata?: Record<string, any>;
}
