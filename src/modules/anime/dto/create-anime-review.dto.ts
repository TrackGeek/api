import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsUUID, Max, MaxLength, Min } from "class-validator";

export class CreateAnimeReviewDto {
  @IsNumber()
  @Max(10)
  @Min(0)
  readonly overall: number;

  @IsNumber()
  @IsOptional()
  @Max(10)
  @Min(0)
  readonly story?: number;

  @IsNumber()
  @IsOptional()
  @Max(10)
  @Min(0)
  readonly characters?: number;

  @IsNumber()
  @IsOptional()
  @Max(10)
  @Min(0)
  readonly animation?: number;

  @IsNumber()
  @IsOptional()
  @Max(10)
  @Min(0)
  readonly sound?: number;

  @IsNumber()
  @IsOptional()
  @Max(10)
  @Min(0)
  readonly enjoyment?: number;

  @IsOptional()
  @MaxLength(250)
  readonly summary?: string;

  @IsOptional()
  @MaxLength(500)
  readonly pros?: string;

  @IsOptional()
  @MaxLength(500)
  readonly cons?: string;

  @IsOptional()
  @MaxLength(1000)
  readonly notes?: string;

  @IsBoolean()
  @IsOptional()
  readonly recommended?: boolean;

  @IsNotEmpty()
  @IsUUID()
  readonly animeId: string;

  readonly userId: string;
}
