import { IsUUID } from 'class-validator';

export class GetTVShowEpisodeWatchDto {
  readonly userId: string;
  
  @IsUUID()
  readonly tvShowId: string;
}
