import { IsNotEmpty } from "class-validator";

export class DeleteAllTVShowEpisodeWatchDto {
  @IsNotEmpty()
  readonly tvShowId: string;

  readonly userId: string;
}
