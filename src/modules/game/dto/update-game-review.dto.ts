import { ApiProperty } from "@nestjs/swagger";
import { CreateGameReviewDto } from "./create-game-review.dto";

export class UpdateGameReviewDto extends CreateGameReviewDto {
  @ApiProperty({
    description: "ID of the game review",
    example: "1",
    type: "string",
  })
  readonly gameReviewId: string;
}
