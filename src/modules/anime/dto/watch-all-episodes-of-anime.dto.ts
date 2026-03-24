import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class WatchAllEpisodesOfAnimeDto {
  @ApiProperty({ type: "string" })
  readonly userId: string;

  @IsUUID()
  @ApiProperty({ type: "string" })
  readonly animeId: string;
}
