import { IsOptional } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetAnimeReviewsDto extends OffsetPaginationParamsDto {
  @IsOptional()
  readonly animeId: string;

  @IsOptional()
  readonly userId: string;
}
