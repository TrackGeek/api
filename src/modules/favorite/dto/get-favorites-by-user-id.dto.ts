import { ApiProperty } from "@nestjs/swagger";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetFavoritesByUserIdDto extends OffsetPaginationParamsDto {
  @ApiProperty({ type: "string", format: "uuid" })
  readonly userId: string;
}
