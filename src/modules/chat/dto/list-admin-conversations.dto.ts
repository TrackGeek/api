import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class ListAdminConversationsDto extends OffsetPaginationParamsDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  readonly search?: string;
}
