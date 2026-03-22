import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetMovieReviewsDto extends OffsetPaginationParamsDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({
    description: "ID of the movie",
    example: "1226863",
    type: "string",
  })
  readonly movieId?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({
    description: "ID of the user",
    example: "1",
    type: "string",
  })
  readonly userId?: string;
}
