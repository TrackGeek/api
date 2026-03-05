import { IsUUID } from 'class-validator';

export class WatchAllEpisodesOfTVShowDto {
  readonly userId: string;
  
  @IsUUID()
  readonly tvShowId: string;
}
