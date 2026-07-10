import { ArrayNotEmpty, IsArray, IsInt, IsPositive, IsUUID, ValidateIf } from "class-validator";

export class SyncWatchedActivityDto {
  @IsUUID("7")
  readonly userId: string;

  @ValidateIf((dto: SyncWatchedActivityDto) => !dto.tvShowId)
  @IsUUID("7")
  readonly animeId?: string;

  @ValidateIf((dto: SyncWatchedActivityDto) => !dto.animeId)
  @IsUUID("7")
  readonly tvShowId?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  readonly episodes: number[];
}
