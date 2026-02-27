import { IsInt } from "class-validator";

export class RefreshBookDto {
  @IsInt()
  readonly id: number;
}
