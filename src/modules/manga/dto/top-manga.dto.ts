import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsPositive } from "class-validator";
import { AnilistMangaFilter, AnilistMangaType } from "@/shared/infra/integrations/anilist.service";

export class TopMangaDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  readonly page?: number;

  @IsEnum(AnilistMangaType)
  @IsOptional()
  readonly type?: AnilistMangaType;

  @IsEnum(AnilistMangaFilter)
  readonly filter: AnilistMangaFilter;
}
