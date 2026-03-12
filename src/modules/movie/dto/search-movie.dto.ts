import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, MinLength } from "class-validator";

export class SearchMovieDto {
  @IsNotEmpty()
  @MinLength(3)
  @ApiProperty({
    description: "Look up movies matching an name.",
    example: "John Wick",
  })
  readonly query: string;
}
