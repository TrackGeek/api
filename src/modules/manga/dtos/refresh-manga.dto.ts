import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class RefreshMangaDto {
	@IsUUID()
	@ApiProperty({
		description: "MAL ID of the manga to refresh",
	})
	readonly id: number;
}
