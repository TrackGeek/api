import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive } from "class-validator";

export class DeleteAnimeEpisodeWatchDto {
  @IsNotEmpty()
  readonly animeId: string;

  readonly userId: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  readonly episode: number;
}
