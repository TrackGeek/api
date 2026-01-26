import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class RequestEmailLoginDto {
	@IsNotEmpty()
	@IsEmail()
	@ApiProperty({ description: "Email address for requesting a login link" })
	readonly email: string;
}
