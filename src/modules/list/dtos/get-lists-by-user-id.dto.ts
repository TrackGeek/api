import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetListsByUserIdDto extends OffsetPaginationParamsDto {
  readonly userId: string;
}
