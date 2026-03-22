import { IsString } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class SearchUserDto extends OffsetPaginationParamsDto {
  @IsString()
  readonly query: string;
}
