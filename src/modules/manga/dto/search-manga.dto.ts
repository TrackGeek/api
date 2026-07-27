import { Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsOptional, IsPositive, Matches } from "class-validator";
import {
  TenraiMangaOrderBy,
  TenraiMangaStatus,
  TenraiMangaType,
  TenraiSort,
} from "@/shared/infra/integrations/tenrai.service";

export class SearchMangaDto {
  @IsOptional()
  readonly query?: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  readonly page?: number;

  @IsEnum(TenraiMangaType)
  @IsOptional()
  readonly type?: TenraiMangaType;

  @IsEnum(TenraiMangaStatus)
  @IsOptional()
  readonly status?: TenraiMangaStatus;

  @Transform(({ value }) => (value as string).split(","))
  @IsArray()
  @IsOptional()
  readonly genres?: string[];

  @IsEnum(TenraiMangaOrderBy)
  @IsOptional()
  readonly orderBy?: TenraiMangaOrderBy;

  @IsEnum(TenraiSort)
  @IsOptional()
  readonly sort?: TenraiSort;

  @Matches(/^[a-zA-Z]$/)
  @IsOptional()
  readonly letter?: string;

  @IsOptional()
  @Matches(/^\d{4}$/)
  readonly year?: string;
}
