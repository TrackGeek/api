import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetFavoritesByUserIdDto extends OffsetPaginationParamsDto {
  @ApiProperty({ type: "string", format: "uuid" })
  readonly userId: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: "Search query to filter favorites by entity name",
    example: "naruto",
    type: "string",
  })
  readonly query?: string;
}
