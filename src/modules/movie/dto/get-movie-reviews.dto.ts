import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetMovieReviewsDto extends OffsetPaginationParamsDto {
  @IsOptional()
  @ApiPropertyOptional({
    description: "ID of the movie",
    example: "1226863",
    type: "string",
  })
  readonly movieId: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: "ID of the user",
    example: "1",
    type: "string",
  })
  readonly userId: string;
}
