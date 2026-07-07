import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetAnimeReviewsDto extends OffsetPaginationParamsDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ type: "string", format: "uuid" })
  readonly animeId?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ type: "string", format: "uuid" })
  readonly userId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: "Search query to filter reviews by media title",
    example: "naruto",
    type: "string",
  })
  readonly query?: string;
}
