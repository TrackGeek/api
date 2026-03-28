import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetAnimeProgressDto extends OffsetPaginationParamsDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ type: String, format: "uuid" })
  readonly userId?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ type: String, format: "uuid" })
  readonly animeId?: string;
}
