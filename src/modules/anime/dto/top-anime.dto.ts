import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsPositive } from "class-validator";
import { JikanAnimeFilter, JikanAnimeRatings, JikanAnimeType } from "@/shared/infra/integrations/jikan.service";

export class TopAnimeDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  @ApiPropertyOptional({ type: "integer", minimum: 0 })
  readonly page?: number;

  @IsEnum(JikanAnimeType)
  @IsOptional()
  @ApiPropertyOptional({ enum: JikanAnimeType })
  readonly type?: JikanAnimeType;

  @IsEnum(JikanAnimeFilter)
  @ApiProperty({ enum: JikanAnimeFilter })
  readonly filter: JikanAnimeFilter;

  @IsEnum(JikanAnimeRatings)
  @IsOptional()
  @ApiPropertyOptional({ enum: JikanAnimeRatings })
  readonly rating?: JikanAnimeRatings;
}
