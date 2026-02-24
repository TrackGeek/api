import { IsNotEmpty } from "class-validator";

export class SearchBookDto {
	@IsNotEmpty()
	readonly query: string;
}
