import { ApiProperty } from "@nestjs/swagger";
import { CreateMovieReviewDto } from "./create-movie-review.dto";

export class UpdateMovieReviewDto extends CreateMovieReviewDto {
  @ApiProperty({
    description: "ID of the movie review",
    example: "1",
    type: "string",
  })
  readonly movieReviewId: string;
}
