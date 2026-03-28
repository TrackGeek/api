import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class DeleteAnimeReviewDto {
  @IsUUID()
  @ApiProperty({ type: String, format: "uuid" })
  readonly animeReviewId: string;

  @IsUUID()
  @ApiProperty({ type: String, format: "uuid" })
  readonly userId: string;
}
