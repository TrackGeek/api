import { WatchEpisodeStatus } from "@prisma/generated/enums";
import { IsEnum, IsInt, IsNotEmpty, IsPositive } from "class-validator";

export class CreateOrUpdateTVShowEpisodeWatchDto {
  @IsEnum(WatchEpisodeStatus)
  readonly status: WatchEpisodeStatus;

  @IsInt()
  @IsPositive()
  readonly season: number;

  @IsInt()
  @IsPositive()
  readonly episode: number;

  @IsNotEmpty()
  readonly tvShowId: string;

  readonly userId: string;
}
