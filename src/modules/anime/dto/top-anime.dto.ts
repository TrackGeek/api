import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsPositive } from "class-validator";
import { TenraiAnimeFilter, TenraiAnimeRatings, TenraiAnimeType } from "@/shared/infra/integrations/tenrai.service";

export class TopAnimeDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  @ApiPropertyOptional({ type: "integer", minimum: 0 })
  readonly page?: number;

  @IsEnum(TenraiAnimeType)
  @IsOptional()
  @ApiPropertyOptional({ enum: TenraiAnimeType })
  readonly type?: TenraiAnimeType;

  @IsEnum(TenraiAnimeFilter)
  @ApiProperty({ enum: TenraiAnimeFilter })
  readonly filter: TenraiAnimeFilter;

  @IsEnum(TenraiAnimeRatings)
  @IsOptional()
  @ApiPropertyOptional({ enum: TenraiAnimeRatings })
  readonly rating?: TenraiAnimeRatings;
}
