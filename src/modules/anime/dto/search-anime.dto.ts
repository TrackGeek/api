import {
  JikanAnimeType,
  JikanAnimeStatus,
  JikanAnimeRatings,
  JikanSort,
  JikanAnimeOrderBy,
} from "@/shared/infra/integrations/jikan.service";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsOptional, IsPositive, Matches } from "class-validator";

export class SearchAnimeDto {
  @IsOptional()
  @ApiPropertyOptional({
    type: "string",
  })
  readonly query?: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  @ApiPropertyOptional({ type: "integer", minimum: 1 })
  readonly page?: number;

  @IsEnum(JikanAnimeType)
  @IsOptional()
  @ApiPropertyOptional({ enum: JikanAnimeType })
  readonly type?: JikanAnimeType;

  @IsEnum(JikanAnimeStatus)
  @IsOptional()
  @ApiPropertyOptional({ enum: JikanAnimeStatus })
  readonly status?: JikanAnimeStatus;

  @IsEnum(JikanAnimeRatings)
  @IsOptional()
  @ApiPropertyOptional({ enum: JikanAnimeRatings })
  readonly rating?: JikanAnimeRatings;

  @Transform(({ value }) => (value as string).split(","))
  @IsArray()
  @IsOptional()
  readonly genres?: string[];

  @IsEnum(JikanAnimeOrderBy)
  @IsOptional()
  @ApiPropertyOptional({ enum: JikanAnimeOrderBy })
  readonly orderBy?: JikanAnimeOrderBy;

  @IsEnum(JikanSort)
  @IsOptional()
  @ApiPropertyOptional({ enum: JikanSort })
  readonly sort?: JikanSort;

  @Matches(/^[a-zA-Z]$/)
  @IsOptional()
  @ApiPropertyOptional({ type: "string" })
  readonly letter?: string;

  @IsOptional()
  @Matches(/^\d{4}$/)
  readonly year?: string;
}
