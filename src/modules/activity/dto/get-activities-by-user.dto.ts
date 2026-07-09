import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetActivitiesByUserDto extends OffsetPaginationParamsDto {
  readonly userId: string;
}
