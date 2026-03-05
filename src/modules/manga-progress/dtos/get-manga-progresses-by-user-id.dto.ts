import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";
import { IsOptional, IsUUID } from 'class-validator';

export class GetMangaProgressesByUserIdDto extends OffsetPaginationParamsDto {
  @IsUUID()
  readonly userId: string;
  
  @IsOptional()
  @IsUUID()
  readonly mangaId?: string;
}
