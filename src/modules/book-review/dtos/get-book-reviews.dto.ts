import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";
import { IsOptional } from "class-validator";

export class GetBookReviewsDto extends OffsetPaginationParamsDto {
	@IsOptional()
	readonly bookId: string;

	@IsOptional()
	readonly userId: string;
}
