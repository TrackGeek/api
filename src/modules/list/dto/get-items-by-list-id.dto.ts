import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetItemsByListIdDto extends OffsetPaginationParamsDto {
  @IsOptional()
  @IsUUID("7", { message: "listId must be a valid UUID" })
  @ApiPropertyOptional({ type: "string", format: "uuid" })
  readonly listId?: string;
}
