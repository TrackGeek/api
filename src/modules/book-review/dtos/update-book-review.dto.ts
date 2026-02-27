import { CreateBookReviewDto } from "./create-book-review.dto";

export class UpdateBookReviewDto extends CreateBookReviewDto {
  readonly bookReviewId: string;
}
