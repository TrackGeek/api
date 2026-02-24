import { IsNotEmpty } from "class-validator";

export class SearchMovieDto {
	@IsNotEmpty()
	readonly query: string;
}
