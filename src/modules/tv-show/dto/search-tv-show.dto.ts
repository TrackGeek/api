import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, MinLength } from "class-validator";

export class SearchTVShowDto {
  @IsNotEmpty()
  @MinLength(3)
  @ApiProperty({
    description: "Look up tv shows matching an name.",
    example: "La Casa de Papel",
    type: "string",
  })
  readonly query: string;
}
