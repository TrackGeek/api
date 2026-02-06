import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class SearchMovieDto {
	@IsNotEmpty()
	@ApiProperty({ description: "The search query for finding movies" })
	readonly query: string;
}
