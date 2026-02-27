import { IsOptional } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetTVShowReviewsDto extends OffsetPaginationParamsDto {
  @IsOptional()
  readonly tvShowId: string;

  @IsOptional()
  readonly userId: string;
}
