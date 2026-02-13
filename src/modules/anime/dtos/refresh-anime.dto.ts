import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class RefreshAnimeDto {
	@IsUUID()
	@ApiProperty({
		description: "MAL ID of the anime to refresh",
	})
	readonly id: number;
}
