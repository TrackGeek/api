import { IsNotEmpty, IsOptional } from "class-validator";

export class UpdateProfileDto {
	readonly userId: string;

	@IsNotEmpty()
	readonly color: string;

	@IsNotEmpty()
	readonly language: string;

	@IsOptional()
	readonly timezone: string;

	@IsOptional()
	readonly about: string;
}
