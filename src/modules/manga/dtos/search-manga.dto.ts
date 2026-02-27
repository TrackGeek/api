import { IsNotEmpty, MinLength } from "class-validator";

export class SearchMangaDto {
  @IsNotEmpty()
  @MinLength(3)
  readonly query: string;
}
