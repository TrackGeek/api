import {
  JikanAnimeRatings,
  JikanAnimeType,
  JikanAnimeFilter,
} from "@/shared/infra/integrations/jikan.service";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsPositive } from "class-validator";

export class TopAnimeDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  readonly page?: number;

  @IsEnum(JikanAnimeType)
  @IsOptional()
  readonly type?: JikanAnimeType;
  
  @IsEnum(JikanAnimeFilter)
  readonly filter: JikanAnimeFilter;
  
  @IsEnum(JikanAnimeRatings)
  @IsOptional()
  readonly rating?: JikanAnimeRatings;
}
