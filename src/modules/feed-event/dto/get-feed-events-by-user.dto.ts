import { ApiProperty } from "@nestjs/swagger";
import { CursorPaginationParamsDto } from "@/shared/infra/database/dtos/cursor-pagination.dto";

export class GetFeedEventsByUserDto extends CursorPaginationParamsDto {
  @ApiProperty({ type: "string", format: "uuid" })
  readonly userId: string;
}
