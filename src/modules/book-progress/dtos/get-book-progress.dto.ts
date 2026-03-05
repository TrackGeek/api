import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";
import { IsOptional, IsUUID } from "class-validator";

export class GetBookProgressDto extends OffsetPaginationParamsDto {
  @IsUUID()
  readonly userId: string;

  @IsOptional()
  @IsUUID()
  readonly bookId?: string;
}
