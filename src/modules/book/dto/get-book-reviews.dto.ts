import { IsOptional } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetBookReviewsDto extends OffsetPaginationParamsDto {
  @IsOptional()
  readonly bookId: string;

  @IsOptional()
  readonly userId: string;
}
