import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class RefreshGameDto {
	@IsUUID()
	@ApiProperty({
		description: "IGDB ID of the game to refresh",
	})
	readonly id: number;
}
