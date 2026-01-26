import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class LoginWithEmailDto {
	@IsNotEmpty()
	@ApiProperty({ description: "Token received via email for authentication" })
	readonly code: string;
}
