import { IsOptional } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetMovieReviewsDto extends OffsetPaginationParamsDto {
  @IsOptional()
  readonly movieId: string;

  @IsOptional()
  readonly userId: string;
}
