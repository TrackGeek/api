import { IsOptional } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetGameReviewsDto extends OffsetPaginationParamsDto {
  @IsOptional()
  readonly gameId: string;

  @IsOptional()
  readonly userId: string;
}
