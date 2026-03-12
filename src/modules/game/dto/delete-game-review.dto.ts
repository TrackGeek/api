import { ApiProperty } from "@nestjs/swagger";

export class DeleteGameReviewDto {
  @ApiProperty({
    description: "ID of the game review",
    example: "1",
    type: "string",
  })
  readonly gameReviewId: string;

  @ApiProperty({
    description: "ID of the user",
    example: "019ce334-a06a-78bc-9178-93f7274610ee",
    type: "string",
  })
  readonly userId: string;
}
