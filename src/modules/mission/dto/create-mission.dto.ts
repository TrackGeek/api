import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ContentType, MissionMetric, MissionTier } from "@prisma/generated/enums";
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Min } from "class-validator";

export class CreateMissionDto {
  // Chave i18n: missions:{key}.name / .description. O banco não guarda texto.
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9_]+$/, { message: "key must be lower_snake_case" })
  @ApiProperty()
  readonly key: string;

  @IsEnum(MissionMetric)
  @IsNotEmpty()
  @ApiProperty({ enum: MissionMetric })
  readonly metric: MissionMetric;

  @IsOptional()
  @IsEnum(ContentType)
  @ApiPropertyOptional({ enum: ContentType })
  readonly contentType?: ContentType;

  @IsInt()
  @Min(1)
  @ApiProperty()
  readonly target: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional()
  readonly xpReward?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional()
  readonly coinReward?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  readonly cosmeticKey?: string;

  @IsOptional()
  @IsUUID("7")
  @ApiPropertyOptional()
  readonly medalId?: string;

  @IsOptional()
  @IsEnum(MissionTier)
  @ApiPropertyOptional({ enum: MissionTier })
  readonly tier?: MissionTier;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional()
  readonly position?: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  readonly hidden?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  readonly active?: boolean;
}
