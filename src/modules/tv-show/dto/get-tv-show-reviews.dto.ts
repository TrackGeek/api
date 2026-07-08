import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetTVShowReviewsDto extends OffsetPaginationParamsDto {
  @IsOptional()
  @ApiPropertyOptional({
    description: "ID of the TV show",
    example: "14424",
    type: "string",
  })
  readonly tvShowId?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: "ID of the user",
    example: "1",
    type: "string",
  })
  readonly userId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: "Search query to filter reviews by media title",
    example: "breaking bad",
    type: "string",
  })
  readonly query?: string;
}
