import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class CreateUserDto {
	@IsEmail()
	@ApiProperty({ description: "User's email address" })
	readonly email: string;

	@IsNotEmpty()
	@ApiProperty({ description: "User's display name", required: false })
	readonly name: string;

	@ApiProperty({ description: "User's username", required: false })
	readonly username?: string;

	@ApiProperty({ description: "User's avatar URL", required: false })
	readonly avatarUrl?: string | null;

	readonly googleId?: string | null;

	readonly discordId?: string | null;

	readonly githubId?: string | null;
}
