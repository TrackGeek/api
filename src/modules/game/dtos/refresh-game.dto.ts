import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class RefreshGameDto {
	@IsUUID()
	@ApiProperty({
		description: "The unique identifier of the game to be refreshed",
	})
	readonly id: string;
}
