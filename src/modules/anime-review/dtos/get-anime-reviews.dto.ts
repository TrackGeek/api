import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";
import { IsOptional } from "class-validator";

export class GetAnimeReviewsDto extends OffsetPaginationParamsDto {
	@IsOptional()
	readonly animeId: string;

	@IsOptional()
	readonly userId: string;
}
