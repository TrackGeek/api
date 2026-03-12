import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class WatchAllEpisodesOfTVShowDto {
  @ApiPropertyOptional({
    description: "ID of the user",
    example: "1",
    type: "string",
  })
  readonly userId: string;

  @IsUUID()
  @ApiProperty({
    description: "ID of the TV show",
    example: "14424",
    type: "string",
  })
  readonly tvShowId: string;
}
