import { IsUUID } from 'class-validator';

export class GetAnimeEpisodeWatchDto {
  readonly userId: string;
  
  @IsUUID()
  readonly animeId: string;
}
