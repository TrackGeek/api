import { IsNotEmpty, MinLength } from "class-validator";

export class SearchMovieDto {
	@IsNotEmpty()
	@MinLength(3)
	readonly query: string;
}
