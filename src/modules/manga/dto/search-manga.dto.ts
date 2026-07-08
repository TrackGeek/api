import { Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsOptional, IsPositive, Matches } from "class-validator";
import {
  JikanMangaOrderBy,
  JikanMangaStatus,
  JikanMangaType,
  JikanSort,
} from "@/shared/infra/integrations/jikan.service";

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

  @Transform(({ value }) => (value as string).split(","))
  @IsArray()
  @IsOptional()
  readonly genres?: string[];

  @IsEnum(JikanMangaOrderBy)
  @IsOptional()
  readonly orderBy?: JikanMangaOrderBy;

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
