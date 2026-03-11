import { Type } from "class-transformer";
import { IsInt, IsOptional, IsPositive } from "class-validator";

export class MangaRecommendationsDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  readonly page?: number;
}
