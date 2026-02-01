import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
	@IsNotEmpty()
	@MinLength(2)
	@MaxLength(50)
	@ApiProperty({ description: "User's display name", required: false })
	readonly name: string;

	@IsNotEmpty()
	@MinLength(3)
	@MaxLength(30)
	@ApiProperty({ description: "User's username", required: false })
	readonly username: string;

	@IsNotEmpty()
	@ApiProperty({ description: "User's preferred language", required: false })
	readonly language: string;

	@IsNotEmpty()
	@ApiProperty({ description: "User's preferred timezone", required: false })
	readonly timezone: string;

	@IsNotEmpty()
	@ApiProperty({ description: "Short bio about the user", required: false })
	readonly about: string;

	@ApiProperty({ description: "User's profile color", required: false })
	readonly color: string;
}
