import { IsInt } from "class-validator";

export class RefreshAnimeDto {
  @IsInt()
  readonly malId: number;
}
