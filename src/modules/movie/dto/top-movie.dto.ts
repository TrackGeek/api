import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsPositive } from "class-validator";
import { TMDBMovieFilter } from "@/shared/infra/integrations/tmdb.service";

export class TopMovieDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  @ApiPropertyOptional({
    type: "number",
    default: 1,
  })
  readonly page?: number;

  @IsEnum(TMDBMovieFilter)
  @ApiProperty({
    enum: TMDBMovieFilter,
  })
  readonly filter: TMDBMovieFilter;
}
