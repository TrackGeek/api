import { IsNotEmpty } from "class-validator";

export class SearchMangaDto {
	@IsNotEmpty()
	readonly query: string;
}
