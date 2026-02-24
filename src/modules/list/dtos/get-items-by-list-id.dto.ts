import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetItemsByListIdDto extends OffsetPaginationParamsDto {
	readonly listId: string;
}
