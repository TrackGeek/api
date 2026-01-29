import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class SearchGameDto {
  @IsNotEmpty()
  @ApiProperty({ description: "The search query for finding games" })
  readonly query: string;
}
