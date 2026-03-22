import { ApiProperty } from "@nestjs/swagger";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";
import { ListType } from '@prisma/generated/enums';
import { IsEnum } from 'class-validator';

export class GetListsByUserIdDto extends OffsetPaginationParamsDto {
  @IsEnum(ListType)
  readonly type: ListType;
  
  readonly userId: string;
}
