import { IsInt, IsNotEmpty, IsPositive } from "class-validator";

export class DeleteAnimeEpisodeWatchDto {
  @IsNotEmpty()
  readonly animeId: string;

  readonly userId: string;

  @IsInt()
  @IsPositive()
  readonly episode: number;
}
