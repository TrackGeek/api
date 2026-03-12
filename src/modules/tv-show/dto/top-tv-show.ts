import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsPositive } from "class-validator";
import { TMDBTVShowFilter } from "@/shared/infra/integrations/tmdb.service";

export class TopTvShowDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  @ApiPropertyOptional({
    type: "number",
    default: 1,
  })
  readonly page?: number;

  @IsEnum(TMDBTVShowFilter)
  @ApiProperty({
    enum: TMDBTVShowFilter,
  })
  readonly filter: TMDBTVShowFilter;
}
