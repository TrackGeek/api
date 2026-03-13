import { ApiProperty } from "@nestjs/swagger";
import { CreateBookReviewDto } from "./create-book-review.dto";

export class UpdateBookReviewDto extends CreateBookReviewDto {
  @ApiProperty({
    description: "ID of the book review",
    example: "019ce334-c8ac-7883-949d-948f53218272",
    type: "string",
  })
  readonly bookReviewId: string;
}
