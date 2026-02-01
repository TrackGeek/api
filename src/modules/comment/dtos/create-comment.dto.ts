import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class CreateCommentDto {
	readonly userId: string;

	@IsNotEmpty()
	@ApiProperty({ example: "This is a comment." })
	readonly content: string;
}
