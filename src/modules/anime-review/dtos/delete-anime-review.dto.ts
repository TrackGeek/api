import { IsUUID } from "class-validator";

export class DeleteAnimeReviewDto {
  @IsUUID()
  readonly animeReviewId: string;

  @IsUUID()
  readonly userId: string;
}
