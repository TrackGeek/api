import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class LoginWithGithubDto {
	@IsNotEmpty()
	@ApiProperty({
		description: "Authorization code received from Github after user consent",
	})
	readonly code: string;
}
