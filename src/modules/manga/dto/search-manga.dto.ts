import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, Matches, Max, Min } from "class-validator";
import {
  AnilistMangaOrderBy,
  AnilistMangaStatus,
  AnilistMangaType,
  AnilistSort,
} from "@/shared/infra/integrations/anilist.service";

export class SearchMangaDto {
  @IsOptional()
  readonly query?: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  readonly page?: number;

  @IsEnum(AnilistMangaType)
  @IsOptional()
  readonly type?: AnilistMangaType;

  @IsEnum(AnilistMangaStatus)
  @IsOptional()
  readonly status?: AnilistMangaStatus;

  @Transform(({ value }) => (value as string).split(","))
  @IsArray()
  @IsOptional()
  readonly genres?: string[];

  @IsEnum(AnilistMangaOrderBy)
  @IsOptional()
  readonly orderBy?: AnilistMangaOrderBy;

  @IsEnum(AnilistSort)
  @IsOptional()
  readonly sort?: AnilistSort;

  @IsOptional()
  @Matches(/^\d{4}$/)
  readonly year?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  @ApiPropertyOptional({ type: "number", minimum: 0, maximum: 5 })
  readonly minTgScore?: number;
}
