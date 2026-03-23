import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsPositive, ValidateIf } from "class-validator";

export class CreateOrUpdateAnimeEpisodeWatchDto {
  @IsNotEmpty()
  readonly animeId: string;

  readonly userId: string;

  @ValidateIf((o) => o.all !== true)
  @IsNotEmpty()
  @IsArray()
  @IsNumber({}, { each: true })
  @IsPositive({ each: true })
  readonly episodes?: number[];

  @ValidateIf((o) => !Array.isArray(o.episodes) || o.episodes.length === 0)
  @IsNotEmpty()
  @IsBoolean()
  readonly all?: boolean;
}
