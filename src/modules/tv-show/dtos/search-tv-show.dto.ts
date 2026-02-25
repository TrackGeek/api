import { IsNotEmpty, MinLength } from "class-validator";

export class SearchTVShowDto {
	@IsNotEmpty()
	@MinLength(3)
	readonly query: string;
}
