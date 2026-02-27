import { CursorPaginationParamsDto } from "@/shared/infra/database/dtos/cursor-pagination.dto";

export class GetFeedEventsByUserDto extends CursorPaginationParamsDto {
  readonly userId: string;
}
