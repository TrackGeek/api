import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";
import { IsOptional, IsUUID } from "class-validator";

export class GetMangaProgressDto extends OffsetPaginationParamsDto {
  @IsOptional()
  @IsUUID()
  readonly userId?: string;

  @IsOptional()
  @IsUUID()
  readonly mangaId?: string;
}
