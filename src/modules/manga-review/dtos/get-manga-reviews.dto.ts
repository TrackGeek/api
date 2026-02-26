import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";
import { IsOptional } from "class-validator";

export class GetMangaReviewsDto extends OffsetPaginationParamsDto {
	@IsOptional()
	readonly mangaId: string;

	@IsOptional()
	readonly userId: string;
}
