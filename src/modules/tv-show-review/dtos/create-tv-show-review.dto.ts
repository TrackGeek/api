import { IsBoolean, IsDecimal, IsNotEmpty, IsOptional, Max, MaxLength, Min } from "class-validator";

export class CreateTVShowReviewDto {
  @IsDecimal()
  @Max(10)
  @Min(0)
  readonly overall: number;

  @IsDecimal()
  @IsOptional()
  @Max(10)
  @Min(0)
  readonly direction?: number;

  @IsDecimal()
  @IsOptional()
  @Max(10)
  @Min(0)
  readonly production?: number;

  @IsDecimal()
  @IsOptional()
  @Max(10)
  @Min(0)
  readonly acting?: number;

  @IsOptional()
  @MaxLength(250)
  readonly summary?: string;

  @IsOptional()
  @MaxLength(1000)
  readonly notes?: string;

  @IsOptional()
  @MaxLength(500)
  readonly story?: string;

  @IsBoolean()
  @IsOptional()
  readonly recommended?: boolean;

  @IsNotEmpty()
  readonly tvShowId: string;

  readonly userId: string;
}
