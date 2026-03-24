import { IsNotEmpty } from "class-validator";

export class DeleteAllAnimeEpisodeWatchDto {
  @IsNotEmpty()
  readonly animeId: string;

  readonly userId: string;
}
