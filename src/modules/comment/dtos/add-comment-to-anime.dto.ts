import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";
import { CreateCommentDto } from "./create-comment.dto";

export class AddCommentToAnimeDto extends CreateCommentDto {
	@IsNotEmpty()
	@ApiProperty({ example: "Anime identifier" })
	readonly animeId: string;
}
