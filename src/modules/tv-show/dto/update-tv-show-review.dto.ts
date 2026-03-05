import { CreateTVShowReviewDto } from "./create-tv-show-review.dto";

export class UpdateTVShowReviewDto extends CreateTVShowReviewDto {
  readonly tvShowReviewId: string;
}
