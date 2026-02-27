import { IsInt } from "class-validator";

export class RefreshGameDto {
  @IsInt()
  readonly id: number;
}
