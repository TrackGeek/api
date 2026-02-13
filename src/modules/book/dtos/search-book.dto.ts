import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class SearchBookDto {
	@IsNotEmpty()
	@ApiProperty({ description: "The search query for finding books" })
	readonly query: string;
}
