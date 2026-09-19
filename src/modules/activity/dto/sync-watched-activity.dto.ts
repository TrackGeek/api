import { ArrayNotEmpty, IsArray, IsInt, IsOptional, IsPositive, IsUUID, Min, ValidateIf } from "class-validator";

export class SyncWatchedActivityDto {
  @IsUUID("7")
  readonly userId: string;

  @ValidateIf((dto: SyncWatchedActivityDto) => !dto.tvShowId)
  @IsUUID("7")
  readonly animeId?: string;

  @ValidateIf((dto: SyncWatchedActivityDto) => !dto.animeId)
  @IsUUID("7")
  readonly tvShowId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  readonly season?: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  readonly episodes: number[];
}
