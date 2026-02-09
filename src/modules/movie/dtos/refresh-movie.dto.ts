import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class RefreshMovieDto {
	@IsUUID()
	@ApiProperty({
		description: "TMDB ID of the movie to refresh",
	})
	readonly id: number;
}
