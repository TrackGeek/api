import { IsNotEmpty } from "class-validator";

export class SearchTVShowDto {
	@IsNotEmpty()
	readonly query: string;
}
