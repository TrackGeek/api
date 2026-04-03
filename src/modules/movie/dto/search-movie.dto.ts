import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsOptional, IsPositive, IsString } from "class-validator";
import { TMDBMovieOrderBy, TMDBSort } from "@/shared/infra/integrations/tmdb.service";

export class SearchMovieDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: "Look up movies matching an name.",
    example: "John Wick",
  })
  readonly query?: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  @ApiPropertyOptional({
    type: "number",
    default: 1,
  })
  readonly page?: number;

  @IsEnum(TMDBMovieOrderBy)
  @IsOptional()
  @ApiPropertyOptional({
    enum: TMDBMovieOrderBy,
  })
  readonly orderBy?: TMDBMovieOrderBy;

  @IsEnum(TMDBSort)
  @IsOptional()
  @ApiPropertyOptional({
    enum: TMDBSort,
    default: TMDBSort.Desc,
  })
  readonly sort?: TMDBSort;

  @Transform(({ value }) => (value as string).split(",").map(Number))
  @IsArray()
  @IsOptional()
  readonly genres?: number[];
}
