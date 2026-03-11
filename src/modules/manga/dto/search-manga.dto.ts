import {
  JikanMangaType,
  JikanMangaStatus,
  JikanSort,
  JikanMangaOrderBy,
} from "@/shared/infra/integrations/jikan.service";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsPositive, Matches } from "class-validator";

export class SearchMangaDto {
  @IsOptional()
  readonly query?: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  readonly page?: number;

  @IsEnum(JikanMangaType)
  @IsOptional()
  readonly type?: JikanMangaType;

  @IsEnum(JikanMangaStatus)
  @IsOptional()
  readonly status?: JikanMangaStatus;

  @Matches(/^\w+(?:,\w+)*$/)
  @IsOptional()
  readonly genres?: string;

  @IsEnum(JikanMangaOrderBy)
  @IsOptional()
  readonly orderBy?: JikanMangaOrderBy;

  @IsEnum(JikanSort)
  @IsOptional()
  readonly sort?: JikanSort;

  @Matches(/^[a-zA-Z]$/)
  @IsOptional()
  readonly letter?: string;
}
