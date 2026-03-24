import { IsNotEmpty } from "class-validator";

export class WatchAllAnimeEpisodesDto {
  @IsNotEmpty()
  readonly animeId: string;

  readonly userId: string;
}
