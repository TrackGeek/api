import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";
import { IsOptional } from "class-validator";

export class GetMovieReviewsDto extends OffsetPaginationParamsDto {
	@IsOptional()
	readonly movieId: string;

	@IsOptional()
	readonly userId: string;
}
