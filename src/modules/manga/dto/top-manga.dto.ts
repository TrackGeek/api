import {
  JikanMangaType,
  JikanMangaFilter,
} from "@/shared/infra/integrations/jikan.service";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsPositive } from "class-validator";

export class TopMangaDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  readonly page?: number;

  @IsEnum(JikanMangaType)
  @IsOptional()
  readonly type?: JikanMangaType;
  
  @IsEnum(JikanMangaFilter)
  readonly filter: JikanMangaFilter;
}
