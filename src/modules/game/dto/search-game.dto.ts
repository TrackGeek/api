import { IsNotEmpty, MinLength } from "class-validator";

export class SearchGameDto {
  @IsNotEmpty()
  @MinLength(3)
  readonly query: string;
}
