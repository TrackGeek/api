import { ApiProperty } from "@nestjs/swagger";
import { WatchEpisodeStatus } from "@prisma/generated/enums";
import { IsEnum, IsInt, IsNotEmpty, IsPositive } from "class-validator";

export class CreateOrUpdateTVShowEpisodeWatchDto {
  @IsEnum(WatchEpisodeStatus)
  @ApiProperty({
    enum: WatchEpisodeStatus,
  })
  readonly status: WatchEpisodeStatus;

  @IsInt()
  @IsPositive()
  @ApiProperty({
    type: "number",
  })
  readonly season: number;

  @IsInt()
  @IsPositive()
  @ApiProperty({
    type: "number",
  })
  readonly episode: number;

  @IsNotEmpty()
  @ApiProperty({
    description: "ID of the TV show",
    example: "14424",
    type: "string",
  })
  readonly tvShowId: string;

  @ApiProperty({
    description: "ID of the user",
    example: "1",
    type: "string",
  })
  readonly userId: string;
}
