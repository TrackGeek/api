import { ApiProperty } from "@nestjs/swagger";

export class DeleteMovieReviewDto {
  @ApiProperty({
    description: "ID of the movie review",
    example: "1",
    type: "string",
  })
  readonly movieReviewId: string;

  @ApiProperty({
    description: "ID of the user",
    example: "1",
    type: "string",
  })
  readonly userId: string;
}
