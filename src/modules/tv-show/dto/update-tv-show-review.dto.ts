import { ApiProperty } from "@nestjs/swagger";
import { CreateTVShowReviewDto } from "./create-tv-show-review.dto";

export class UpdateTVShowReviewDto extends CreateTVShowReviewDto {
  @ApiProperty({
    description: "ID of the TV show review",
    example: "1",
    type: "string",
  })
  readonly tvShowReviewId: string;
}
