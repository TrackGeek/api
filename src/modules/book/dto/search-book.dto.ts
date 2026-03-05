import { IsNotEmpty, MinLength } from "class-validator";

export class SearchBookDto {
  @IsNotEmpty()
  @MinLength(3)
  readonly query: string;
}
