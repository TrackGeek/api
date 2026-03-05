import { IsBoolean, IsDecimal, IsNotEmpty, IsOptional, IsUUID, Max, MaxLength, Min } from "class-validator";

export class CreateBookReviewDto {
  @IsDecimal()
  @Max(10)
  @Min(0)
  readonly overall: number;

  @IsDecimal()
  @IsOptional()
  @Max(10)
  @Min(0)
  readonly characters?: number;

  @IsDecimal()
  @IsOptional()
  @Max(10)
  @Min(0)
  readonly language?: number;

  @IsDecimal()
  @IsOptional()
  @Max(10)
  @Min(0)
  readonly theme?: number;

  @IsOptional()
  @MaxLength(250)
  readonly summary?: string;

  @IsOptional()
  @MaxLength(1000)
  readonly notes?: string;

  @IsBoolean()
  @IsOptional()
  readonly recommended?: boolean;

  @IsNotEmpty()
  @IsUUID()
  readonly bookId: string;

  readonly userId: string;
}
