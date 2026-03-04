import { IsInt } from "class-validator";

export class RefreshGameDto {
  @IsInt()
  readonly igdbId: number;
}
