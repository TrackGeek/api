import { ApiProperty } from "@nestjs/swagger";
import { IsInt } from "class-validator";

export class RefreshBookDto {
  @IsInt()
  @ApiProperty({
    description: "ID of the book on Hardcover",
    example: 1974594,
    type: "integer",
  })
  readonly hardcoverId: number;
}
