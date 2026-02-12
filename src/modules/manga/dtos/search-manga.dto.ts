import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class SearchMangaDto {
	@IsNotEmpty()
	@ApiProperty({ description: "The search query for finding mangas" })
	readonly query: string;
}
