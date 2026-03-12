import { ApiProperty } from "@nestjs/swagger";
import { IsInt } from "class-validator";

export class RefreshGameDto {
  @IsInt()
  @ApiProperty({
    description: "ID of the game on IGDB",
    example: 115289,
    type: "integer",
  })
  readonly igdbId: number;
}
