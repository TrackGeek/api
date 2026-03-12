import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, MinLength } from "class-validator";

export class SearchGameDto {
  @IsNotEmpty()
  @MinLength(3)
  @ApiProperty({
    description: "Look up games matching an name.",
    example: "Grand Theft Auto",
    type: "string",
  })
  readonly query: string;
}
