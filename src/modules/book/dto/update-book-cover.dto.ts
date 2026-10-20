import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

export class UpdateBookCoverDto {
  @ApiProperty({ description: "Hardcover edition whose cover should be used", type: "integer" })
  @IsInt()
  @Min(1)
  readonly editionId: number;
}
