import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";
import { CreateCommentDto } from "./create-comment.dto";

export class AddCommentToTVShowDto extends CreateCommentDto {
	@IsNotEmpty()
	@ApiProperty({ example: "TV show identifier" })
	readonly tvShowId: string;
}
