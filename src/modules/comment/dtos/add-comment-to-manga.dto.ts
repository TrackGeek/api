import { IsNotEmpty } from "class-validator";
import { CreateCommentDto } from "./create-comment.dto";

export class AddCommentToMangaDto extends CreateCommentDto {
  @IsNotEmpty()
  readonly mangaId: string;
}
