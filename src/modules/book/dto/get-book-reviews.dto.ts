import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";

export class GetBookReviewsDto extends OffsetPaginationParamsDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({
    description: "ID of the book",
    example: "019ce334-c8ac-7883-949d-948f53218272",
    type: "string",
  })
  readonly bookId?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({
    description: "ID of the user",
    example: "019ce334-a06a-78bc-9178-93f7274610ee",
    type: "string",
  })
  readonly userId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: "Search query to filter reviews by media title",
    example: "dune",
    type: "string",
  })
  readonly query?: string;
}
