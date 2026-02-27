import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";
import { IsOptional } from "class-validator";

export class GetGameReviewsDto extends OffsetPaginationParamsDto {
	@IsOptional()
	readonly gameId: string;

	@IsOptional()
	readonly userId: string;
}
