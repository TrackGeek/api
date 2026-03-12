import { ApiProperty } from "@nestjs/swagger";
import { IsInt } from "class-validator";

export class RefreshTVShowDto {
  @IsInt()
  @ApiProperty({
    description: "ID of the TV show",
    example: 14424,
    type: "number",
  })
  readonly tmdbId: number;
}
