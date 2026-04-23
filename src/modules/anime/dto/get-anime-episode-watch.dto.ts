import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class GetAnimeEpisodeWatchDto {
  @ApiProperty({ type: String })
  readonly userId: string;

  @IsUUID()
  @ApiProperty({ type: String, format: "uuid" })
  readonly animeId: string;
}
