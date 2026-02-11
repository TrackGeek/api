import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class RefreshTVShowDto {
	@IsUUID()
	@ApiProperty({
		description: "TMDB ID of the tv show to refresh",
	})
	readonly id: number;
}
