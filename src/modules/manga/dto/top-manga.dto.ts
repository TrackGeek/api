import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsPositive } from "class-validator";
import { TenraiMangaFilter, TenraiMangaType } from "@/shared/infra/integrations/tenrai.service";

export class TopMangaDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  readonly page?: number;

  @IsEnum(TenraiMangaType)
  @IsOptional()
  readonly type?: TenraiMangaType;

  @IsEnum(TenraiMangaFilter)
  readonly filter: TenraiMangaFilter;
}
