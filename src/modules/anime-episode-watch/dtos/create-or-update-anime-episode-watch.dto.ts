import { WatchEpisodeStatus } from '@prisma/generated/enums';
import { IsEnum, IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class CreateOrUpdateAnimeEpisodeWatchDto {
  @IsEnum(WatchEpisodeStatus)
  readonly status: WatchEpisodeStatus;

  @IsInt()
  @IsPositive()
  readonly episode: number;
  
  @IsNotEmpty()
  readonly animeId: string;

  readonly userId: string;
}