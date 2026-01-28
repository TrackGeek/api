import { ApiProperty } from "@nestjs/swagger";

export class UserUpdateDto {
	@ApiProperty({ description: "User's display name", required: false })
	readonly name?: string;

	@ApiProperty({ description: "User's username", required: false })
	readonly username?: string;

	@ApiProperty({ description: "User's preferred language", required: false })
	readonly language?: string;
	
	@ApiProperty({ description: "User's preferred timezone", required: false })
	readonly timezone?: string;

	@ApiProperty({ description: "Short bio about the user", required: false })
	readonly about?: string;

	@ApiProperty({ description: "User's profile color", required: false })
	readonly color?: string;
}
