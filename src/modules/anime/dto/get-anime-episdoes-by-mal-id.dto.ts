import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from "class-validator";

export class GetAnimeEpisodesByMalIdDto {
  readonly malId: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  readonly page?: number;
}
