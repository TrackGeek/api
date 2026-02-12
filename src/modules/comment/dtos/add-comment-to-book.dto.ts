import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";
import { CreateCommentDto } from "./create-comment.dto";

export class AddCommentToBookDto extends CreateCommentDto {
	@IsNotEmpty()
	@ApiProperty({ example: "Book identifier" })
	readonly bookId: string;
}
