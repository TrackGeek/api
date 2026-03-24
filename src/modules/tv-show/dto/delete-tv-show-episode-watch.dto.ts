import { IsInt, IsNotEmpty, IsPositive } from "class-validator";

export class DeleteTVShowEpisodeWatchDto {
  @IsNotEmpty()
  readonly tvShowId: string;

  readonly userId: string;

  @IsInt()
  @IsPositive()
  readonly season: number;

  @IsInt()
  @IsPositive()
  readonly episode: number;
}
