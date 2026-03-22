import { IsOptional, IsUUID } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetMangaReviewsDto extends OffsetPaginationParamsDto {
  @IsOptional()
  @IsUUID()
  readonly mangaId?: string;

  @IsOptional()
  @IsUUID()
  readonly userId?: string;
}
