import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, Matches, Max, Min } from "class-validator";
import { TMDBSort, TMDBTVShowOrderBy } from "@/shared/infra/integrations/tmdb.service";

export class SearchTVShowDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: "Look up tv shows matching an name.",
    example: "La Casa de Papel",
    type: "string",
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

  @IsEnum(TMDBTVShowOrderBy)
  @IsOptional()
  @ApiPropertyOptional({
    enum: TMDBTVShowOrderBy,
  })
  readonly orderBy?: TMDBTVShowOrderBy;

  @IsEnum(TMDBSort)
  @IsOptional()
  @ApiPropertyOptional({
    enum: TMDBSort,
    default: TMDBSort.Desc,
  })
  readonly sort?: TMDBSort;

  @Transform(({ value }) => (value as string).split(","))
  @IsArray()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Filter TV shows by genre name or TMDB genre id. Matches all of them.",
    example: "Drama,Crime",
    type: "string",
  })
  readonly genres?: string[];

  @IsOptional()
  @Matches(/^\d{4}$/)
  @ApiPropertyOptional({ type: "string", example: "2014" })
  readonly year?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  @ApiPropertyOptional({ type: "number", minimum: 0, maximum: 5 })
  readonly minTgScore?: number;
}
