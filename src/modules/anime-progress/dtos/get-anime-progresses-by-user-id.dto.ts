import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";
import { IsUUID } from 'class-validator';

export class GetAnimeProgressesByUserIdDto extends OffsetPaginationParamsDto {
  @IsUUID()
  readonly userId: string;
}
