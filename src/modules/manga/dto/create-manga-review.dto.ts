import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, Max, MaxLength, Min } from "class-validator";

export class CreateMangaReviewDto {
  @IsNumber()
  @Max(5)
  @Min(0)
  readonly overall: number;

  @IsNumber()
  @IsOptional()
  @Max(5)
  @Min(0)
  readonly art?: number;

  @IsNumber()
  @IsOptional()
  @Max(5)
  @Min(0)
  readonly worldbuilding?: number;

  @IsOptional()
  @MaxLength(500)
  readonly summary?: string;

  @IsOptional()
  @MaxLength(10000)
  readonly notes?: string;

  @IsOptional()
  @MaxLength(500)
  readonly story?: string;

  @IsOptional()
  @MaxLength(500)
  readonly characters?: string;

  @IsBoolean()
  @IsOptional()
  readonly recommended?: boolean;

  @IsNotEmpty()
  readonly mangaId: string;

  readonly userId: string;
}
