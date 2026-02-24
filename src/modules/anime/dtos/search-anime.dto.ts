import { IsNotEmpty } from "class-validator";

export class SearchAnimeDto {
	@IsNotEmpty()
	readonly query: string;
}
