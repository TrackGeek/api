import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsOptional, IsPositive, Matches } from "class-validator";
import {
  TenraiAnimeOrderBy,
  TenraiAnimeRatings,
  TenraiAnimeStatus,
  TenraiAnimeType,
  TenraiSort,
} from "@/shared/infra/integrations/tenrai.service";

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

  @IsEnum(TenraiAnimeType)
  @IsOptional()
  @ApiPropertyOptional({ enum: TenraiAnimeType })
  readonly type?: TenraiAnimeType;

  @IsEnum(TenraiAnimeStatus)
  @IsOptional()
  @ApiPropertyOptional({ enum: TenraiAnimeStatus })
  readonly status?: TenraiAnimeStatus;

  @IsEnum(TenraiAnimeRatings)
  @IsOptional()
  @ApiPropertyOptional({ enum: TenraiAnimeRatings })
  readonly rating?: TenraiAnimeRatings;

  @Transform(({ value }) => (value as string).split(","))
  @IsArray()
  @IsOptional()
  readonly genres?: string[];

  @IsEnum(TenraiAnimeOrderBy)
  @IsOptional()
  @ApiPropertyOptional({ enum: TenraiAnimeOrderBy })
  readonly orderBy?: TenraiAnimeOrderBy;

  @IsEnum(TenraiSort)
  @IsOptional()
  @ApiPropertyOptional({ enum: TenraiSort })
  readonly sort?: TenraiSort;

  @Matches(/^[a-zA-Z]$/)
  @IsOptional()
  @ApiPropertyOptional({ type: "string" })
  readonly letter?: string;

  @IsOptional()
  @Matches(/^\d{4}$/)
  readonly year?: string;
}
