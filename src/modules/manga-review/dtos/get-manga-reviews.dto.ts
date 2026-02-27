import { IsOptional } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetMangaReviewsDto extends OffsetPaginationParamsDto {
  @IsOptional()
  readonly mangaId: string;

  @IsOptional()
  readonly userId: string;
}
