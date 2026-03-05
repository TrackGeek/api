import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetFavoritesByUserIdDto extends OffsetPaginationParamsDto {
  readonly userId: string;
}
