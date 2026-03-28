import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsPositive, Matches } from "class-validator";
import {
  JikanAnimeOrderBy,
  JikanAnimeRatings,
  JikanAnimeStatus,
  JikanAnimeType,
  JikanSort,
} from "@/shared/infra/integrations/jikan.service";

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

  @Matches(/^\w+(?:,\w+)*$/)
  @IsOptional()
  @ApiPropertyOptional({ type: "string" })
  readonly genres?: string;

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
  @ApiPropertyOptional({ type: "string" })
  readonly year?: string;
}
