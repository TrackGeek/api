import { WatchEpisodeStatus } from "@prisma/generated/enums";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsPositive, ValidateNested } from "class-validator";

export class AnimeEpisodeWatchItemDto {
  @IsNumber()
  @IsPositive()
  readonly episode: number;

  @IsEnum(WatchEpisodeStatus)
  readonly status: WatchEpisodeStatus;
}

export class CreateOrUpdateAnimeEpisodeWatchDto {
  @IsNotEmpty()
  readonly animeId: string;

  readonly userId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnimeEpisodeWatchItemDto)
  readonly episodes: AnimeEpisodeWatchItemDto[];
}
