import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsUUID, Max, MaxLength, Min } from "class-validator";

export class CreateAnimeReviewDto {
  @IsNumber()
  @Max(10)
  @Min(0)
  @ApiProperty({ type: "number", minimum: 0, maximum: 10 })
  readonly overall: number;

  @IsNumber()
  @IsOptional()
  @Max(10)
  @Min(0)
  @ApiPropertyOptional({ type: "number", minimum: 0, maximum: 10 })
  readonly story?: number;

  @IsNumber()
  @IsOptional()
  @Max(10)
  @Min(0)
  @ApiPropertyOptional({ type: "number", minimum: 0, maximum: 10 })
  readonly characters?: number;

  @IsNumber()
  @IsOptional()
  @Max(10)
  @Min(0)
  @ApiPropertyOptional({ type: "number", minimum: 0, maximum: 10 })
  readonly animation?: number;

  @IsNumber()
  @IsOptional()
  @Max(10)
  @Min(0)
  @ApiPropertyOptional({ type: "number", minimum: 0, maximum: 10 })
  readonly sound?: number;

  @IsNumber()
  @IsOptional()
  @Max(10)
  @Min(0)
  @ApiPropertyOptional({ type: "number", minimum: 0, maximum: 10 })
  readonly enjoyment?: number;

  @IsOptional()
  @MaxLength(250)
  @ApiPropertyOptional({ type: "string", maxLength: 250 })
  readonly summary?: string;

  @IsOptional()
  @MaxLength(500)
  @ApiPropertyOptional({ type: "string", maxLength: 500 })
  readonly pros?: string;

  @IsOptional()
  @MaxLength(500)
  @ApiPropertyOptional({ type: "string", maxLength: 500 })
  readonly cons?: string;

  @IsOptional()
  @MaxLength(1000)
  @ApiPropertyOptional({ type: "string", maxLength: 1000 })
  readonly notes?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ type: "boolean" })
  readonly recommended?: boolean;

  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ type: "string", format: "uuid" })
  readonly animeId: string;

  @ApiProperty({ type: "string" })
  readonly userId: string;
}
