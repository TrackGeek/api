import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class SearchAnimeDto {
	@IsNotEmpty()
	@ApiProperty({ description: "The search query for finding animes" })
	readonly query: string;
}
