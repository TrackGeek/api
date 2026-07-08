import { ApiPropertyOptional } from "@nestjs/swagger";
import { ListType } from "@prisma/generated/enums";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetListsByUserIdDto extends OffsetPaginationParamsDto {
  @IsOptional()
  @IsEnum(ListType)
  @ApiPropertyOptional({ enum: ListType })
  readonly type?: ListType;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: "Search query to filter lists by name",
    example: "favorites",
    type: "string",
  })
  readonly query?: string;

  readonly userId: string;
}
