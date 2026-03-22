import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsUUID } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetFollowingDto extends OffsetPaginationParamsDto {
  @IsUUID()
  @ApiPropertyOptional({
    description: "ID of the user",
    example: "1",
    type: "string",
  })
  readonly userId: string;
}
