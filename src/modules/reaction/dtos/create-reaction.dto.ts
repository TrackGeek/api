import { IsEmoji } from "@/shared/validators/is-emoji.validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateReactionDto {
	@IsEmoji({ message: "Only emojis are allowed" })
	@ApiProperty({ example: "🟣" }) // Roxo Dog
	readonly emoji: string;

	readonly userId: string;
}
