import { IsInt } from "class-validator";

export class RefreshTVShowDto {
  @IsInt()
  readonly tmdbId: number;
}
