import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsOptional, IsPositive, IsString } from "class-validator";
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

  @Transform(({ value }) => (value as string).split(",").map(Number))
  @IsArray()
  @IsOptional()
  readonly genres?: number[];
}
