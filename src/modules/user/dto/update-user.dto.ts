import { IsUUID } from "class-validator";

export class UpdateUserDto {
	@IsUUID()
	readonly id: string;

	readonly name?: string;

	readonly image?: string | null;
}
