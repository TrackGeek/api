import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class RefreshBookDto {
	@IsUUID()
	@ApiProperty({
		description: "Hardcover ID of the book to refresh",
	})
	readonly id: number;
}
