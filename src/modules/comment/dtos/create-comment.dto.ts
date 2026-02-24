import { IsNotEmpty } from "class-validator";

export class CreateCommentDto {
	readonly userId: string;

	@IsNotEmpty()
	readonly content: string;
}
