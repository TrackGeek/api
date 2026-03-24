import {
  JikanAnimeType,
  JikanAnimeStatus,
  JikanAnimeRatings,
  JikanSort,
  JikanAnimeOrderBy,
} from "@/shared/infra/integrations/jikan.service";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsPositive, Matches } from "class-validator";

export class SearchAnimeDto {
  @IsOptional()
  readonly query?: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  readonly page?: number;

  @IsEnum(JikanAnimeType)
  @IsOptional()
  readonly type?: JikanAnimeType;

  @IsEnum(JikanAnimeStatus)
  @IsOptional()
  readonly status?: JikanAnimeStatus;

  @IsEnum(JikanAnimeRatings)
  @IsOptional()
  readonly rating?: JikanAnimeRatings;

  @Matches(/^\d+(?:,\d+)*$/)
  @IsOptional()
  readonly genres?: string;

  @IsEnum(JikanAnimeOrderBy)
  @IsOptional()
  readonly orderBy?: JikanAnimeOrderBy;

  @IsEnum(JikanSort)
  @IsOptional()
  readonly sort?: JikanSort;

  @Matches(/^[a-zA-Z]$/)
  @IsOptional()
  readonly letter?: string;

  @IsOptional()
  @Matches(/^\d{4}$/)
  readonly year?: string;
}
