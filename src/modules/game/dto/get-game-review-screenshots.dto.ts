import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional } from "class-validator";
import { OffsetPaginationParamsDto } from "@/shared/infra/database/dtos/offset-pagination.dto";
import { AtLeastOneOf } from "@/shared/validators/at-least-one-of.validator";

export class GetGameReviewScreenshotsDto extends OffsetPaginationParamsDto {
  @IsOptional()
  @AtLeastOneOf(["userId", "gameReviewId", "gameId"])
  @ApiPropertyOptional({
    description: "ID of the user",
    example: "019ce334-a06a-78bc-9178-93f7274610ee",
    type: "string",
  })
  readonly userId?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: "ID of the game review",
    example: "019ce334-c8ac-7883-949d-948f53218272",
    type: "string",
  })
  readonly gameReviewId?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: "ID of the game",
    example: "019ce334-c8ac-7883-949d-948f53218272",
    type: "string",
  })
  readonly gameId?: string;
}
