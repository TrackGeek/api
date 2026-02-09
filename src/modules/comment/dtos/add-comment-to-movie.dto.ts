import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";
import { CreateCommentDto } from "./create-comment.dto";

export class AddCommentToMovieDto extends CreateCommentDto {
	@IsNotEmpty()
	@ApiProperty({ example: "Movie identifier" })
	readonly movieId: string;
}
