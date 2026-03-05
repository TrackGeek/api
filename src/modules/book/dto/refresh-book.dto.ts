import { IsInt } from "class-validator";

export class RefreshBookDto {
  @IsInt()
  readonly hardcoverId: number;
}
