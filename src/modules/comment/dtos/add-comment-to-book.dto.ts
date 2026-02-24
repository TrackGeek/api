import { IsNotEmpty } from "class-validator";
import { CreateCommentDto } from "./create-comment.dto";

export class AddCommentToBookDto extends CreateCommentDto {
	@IsNotEmpty()
	readonly bookId: string;
}
