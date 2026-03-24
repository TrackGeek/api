import { ApiProperty } from "@nestjs/swagger";
import { WatchEpisodeStatus } from "@prisma/generated/enums";
import { IsEnum, IsInt, IsNotEmpty, IsPositive } from "class-validator";

export class CreateOrUpdateAnimeEpisodeWatchDto {
  @IsEnum(WatchEpisodeStatus)
  @ApiProperty({ enum: WatchEpisodeStatus })
  readonly status: WatchEpisodeStatus;

  @IsInt()
  @IsPositive()
  @ApiProperty({ type: "integer", minimum: 0 })
  readonly episode: number;

  @IsNotEmpty()
  @ApiProperty({ type: "string" })
  readonly animeId: string;

  @ApiProperty({ type: "string" })
  readonly userId: string;
}
