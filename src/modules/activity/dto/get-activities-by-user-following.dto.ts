import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetActivitiesByUserFollowingDto extends OffsetPaginationParamsDto {
  readonly userId: string;
}
