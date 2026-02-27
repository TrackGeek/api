import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";
import { IsOptional } from "class-validator";

export class GetTVShowReviewsDto extends OffsetPaginationParamsDto {
	@IsOptional()
	readonly tvShowId: string;

	@IsOptional()
	readonly userId: string;
}
