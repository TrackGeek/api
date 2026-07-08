import { IsOptional, IsUUID } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetMangaProgressDto extends OffsetPaginationParamsDto {
  @IsOptional()
  @IsUUID()
  readonly userId?: string;

  @IsOptional()
  @IsUUID()
  readonly mangaId?: string;
}
