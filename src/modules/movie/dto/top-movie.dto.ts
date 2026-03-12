import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsPositive } from "class-validator";
import { TMDBMovieFilter } from "@/shared/infra/integrations/tmdb.service";

export class TopMovieDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  readonly page?: number;

  @IsEnum(TMDBMovieFilter)
  readonly filter: TMDBMovieFilter;
}
