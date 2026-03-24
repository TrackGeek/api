import { ApiProperty } from "@nestjs/swagger";
import { IsInt } from "class-validator";

export class RefreshAnimeDto {
  @IsInt()
  @ApiProperty({ type: "integer" })
  readonly malId: number;
}
