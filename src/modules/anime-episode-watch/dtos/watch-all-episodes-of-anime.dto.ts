import { IsUUID } from 'class-validator';

export class WatchAllEpisodesOfAnimeDto {
  readonly userId: string;
  
  @IsUUID()
  readonly animeId: string;
}
