import { IsOptional, IsUUID } from "class-validator";
import { ProgressFilterParamsDto } from "@/shared/media-filter/dtos/progress-filter.dto";

export class GetMangaProgressDto extends ProgressFilterParamsDto {
  @IsOptional()
  @IsUUID()
  readonly userId?: string;

  @IsOptional()
  @IsUUID()
  readonly mangaId?: string;
}
