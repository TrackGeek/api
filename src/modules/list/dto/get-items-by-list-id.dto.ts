import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetItemsByListIdDto extends OffsetPaginationParamsDto {
  @IsUUID("7", { message: "listId must be a valid UUID" })
  @ApiProperty({ type: "string", format: "uuid" })
  readonly listId: string;
}
