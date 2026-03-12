import { ApiProperty } from "@nestjs/swagger";

export class DeleteTVShowReviewDto {
  @ApiProperty({
    description: "ID of the review of series.",
    example: "1",
    type: "string",
  })
  readonly tvShowReviewId: string;

  @ApiProperty({
    description: "ID of the user",
    example: "1",
    type: "string",
  })
  readonly userId: string;
}
