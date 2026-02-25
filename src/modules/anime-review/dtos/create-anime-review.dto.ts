import { IsBoolean, IsDecimal, IsNotEmpty, IsOptional, IsPositive, Max, MaxLength, Min } from 'class-validator';

export class CreateAnimeReviewDto {
  @IsDecimal()
  @Max(10)
  @Min(0)
  readonly overall: number;
  
  @IsDecimal()
  @IsOptional()
  @Max(10)
  @Min(0)
  readonly story?: number;
  
  @IsDecimal()
  @IsOptional()
  @Max(10)
  @Min(0)
  readonly characters?: number;
  
  @IsDecimal()
  @IsOptional()
  @Max(10)
  @Min(0)
  readonly animation?: number;
  
  @IsDecimal()
  @IsOptional()
  @Max(10)
  @Min(0)
  readonly sound?: number;
  
  @IsDecimal()
  @IsOptional()
  @Max(10)
  @Min(0)
  readonly enjoyment?: number;
  
  @IsOptional()
  @MaxLength(50)
  readonly summary?: string;
  
  @IsOptional()
  @MaxLength(500)
  readonly pros?: string;
  
  @IsOptional()
  @MaxLength(500)
  readonly cons?: string;
  
  @IsOptional()
  readonly notes?: string;
  
  @IsBoolean()
  @IsOptional()
  readonly recommended?: boolean;
  
  @IsNotEmpty()
  readonly animeId: string;
  
  readonly userId: string;
}