import { IsNotEmpty, MinLength } from "class-validator";

export class SearchAnimeDto {
	@IsNotEmpty()
	@MinLength(3)
	readonly query: string;
}
