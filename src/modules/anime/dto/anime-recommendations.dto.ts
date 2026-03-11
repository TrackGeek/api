import { Type } from "class-transformer";
import { IsInt, IsOptional, IsPositive } from "class-validator";

export class AnimeRecommendationsDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  readonly page?: number;
}
