import { WatchEpisodeStatus } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsPositive, ValidateNested } from "class-validator";

export class TVShowEpisodeWatchItemDto {
  @IsInt()
  @IsPositive()
  readonly season: number;

  @IsInt()
  @IsPositive()
  readonly episode: number;

  @IsEnum(WatchEpisodeStatus)
  readonly status: WatchEpisodeStatus;
}

export class CreateOrUpdateTVShowEpisodeWatchDto {
  @IsNotEmpty()
  readonly tvShowId: string;

  readonly userId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TVShowEpisodeWatchItemDto)
  readonly episodes: TVShowEpisodeWatchItemDto[];
}
