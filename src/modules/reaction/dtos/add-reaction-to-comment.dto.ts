import { IsNotEmpty } from "class-validator";
import { CreateReactionDto } from "./create-reaction.dto";

export class AddReactionToCommentDto extends CreateReactionDto {
	@IsNotEmpty()
	readonly commentId: string;
}
