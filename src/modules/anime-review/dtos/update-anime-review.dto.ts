import { CreateAnimeReviewDto } from "./create-anime-review.dto";

export class UpdateAnimeReviewDto extends CreateAnimeReviewDto {
  readonly animeReviewId: string;
}
