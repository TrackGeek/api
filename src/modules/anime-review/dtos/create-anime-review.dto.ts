import { IsBoolean, IsDecimal, IsNotEmpty, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class CreateAnimeReviewDto {
  @IsDecimal()
  @IsNotEmpty()
  @Max(10)
  @Min(0)
  readonly overall: number;
  
  @IsDecimal()
  @IsNotEmpty()
  @Max(10)
  @Min(0)
  readonly story: number;
  
  @IsDecimal()
  @IsNotEmpty()
  @Max(10)
  @Min(0)
  readonly characters: number;
  
  @IsDecimal()
  @IsNotEmpty()
  @Max(10)
  @Min(0)
  readonly animation: number;
  
  @IsDecimal()
  @IsNotEmpty()
  @Max(10)
  @Min(0)
  readonly sound: number;
  
  @IsDecimal()
  @IsNotEmpty()
  @Max(10)
  @Min(0)
  readonly enjoyment: number;
  
  @IsOptional()
  readonly summary: string;
  
  @IsOptional()
  readonly pros: string;
  
  @IsOptional()
  readonly cons: string;
  
  @IsOptional()
  readonly notes: string;
  
  @IsBoolean()
  readonly recommended: boolean;
  
  @IsNotEmpty()
  readonly animeId: string;
  
  readonly userId: string;
}