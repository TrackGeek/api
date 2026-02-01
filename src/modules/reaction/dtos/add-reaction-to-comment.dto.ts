import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";
import { CreateReactionDto } from "./create-reaction.dto";

export class AddReactionToCommentDto extends CreateReactionDto {
	@IsNotEmpty()
	@ApiProperty({ example: "Comment identifier" })
	readonly commentId: string;
}
