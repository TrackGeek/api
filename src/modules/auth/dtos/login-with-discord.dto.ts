import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class LoginWithDiscordDto {
	@IsNotEmpty()
	@ApiProperty({
		description: "Authorization code received from Discord after user consent",
	})
	readonly code: string;
}
