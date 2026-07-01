import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { ListType } from "@prisma/generated/enums";
import { IsEnum, IsOptional } from "class-validator";

export class GetListsByUserIdDto extends OffsetPaginationParamsDto {
  @IsOptional()
  @IsEnum(ListType)
  @ApiPropertyOptional({ enum: ListType })
  readonly type?: ListType;

  readonly userId: string;
}
