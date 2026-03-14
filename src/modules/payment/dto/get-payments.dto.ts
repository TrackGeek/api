import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetPaymentsDto extends OffsetPaginationParamsDto {
  readonly userId: string;
}
