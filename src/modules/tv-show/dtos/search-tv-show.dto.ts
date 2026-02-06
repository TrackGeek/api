import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class SearchTVShowDto {
	@IsNotEmpty()
	@ApiProperty({ description: "The search query for finding TV shows" })
	readonly query: string;
}
