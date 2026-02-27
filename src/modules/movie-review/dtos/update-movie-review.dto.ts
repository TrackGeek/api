import { CreateMovieReviewDto } from "./create-movie-review.dto";

export class UpdateMovieReviewDto extends CreateMovieReviewDto {
  readonly movieReviewId: string;
}
