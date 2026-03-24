import { ApiProperty } from "@nestjs/swagger";
import { CreateAnimeReviewDto } from "./create-anime-review.dto";

export class UpdateAnimeReviewDto extends CreateAnimeReviewDto {
  @ApiProperty({ type: "string" })
  readonly animeReviewId: string;
}
