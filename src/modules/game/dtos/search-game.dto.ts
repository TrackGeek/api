import { IsNotEmpty } from "class-validator";

export class SearchGameDto {
	@IsNotEmpty()
	readonly query: string;
}
