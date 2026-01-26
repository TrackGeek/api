import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class LoginWithGoogleDto {
	@IsNotEmpty()
	@ApiProperty({
		description: "Authorization code received from Google after user consent",
	})
	readonly code: string;
}
