import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";
import { CreateCommentDto } from "./create-comment.dto";

export class AddCommentToMangaDto extends CreateCommentDto {
	@IsNotEmpty()
	@ApiProperty({ example: "Manga identifier" })
	readonly mangaId: string;
}
