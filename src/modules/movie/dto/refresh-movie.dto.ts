import { ApiProperty } from "@nestjs/swagger";
import { IsInt } from "class-validator";

export class RefreshMovieDto {
  @IsInt()
  @ApiProperty({
    description: "ID of the movie",
    example: 1226863,
    type: "number",
  })
  readonly id: number;
}
