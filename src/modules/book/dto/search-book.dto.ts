import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, MinLength } from "class-validator";

export class SearchBookDto {
  @IsNotEmpty()
  @MinLength(3)
  @ApiProperty({
    description: "Lookup for a book matching a name",
    example: "The Witcher",
    type: "string",
  })
  readonly query: string;
}
