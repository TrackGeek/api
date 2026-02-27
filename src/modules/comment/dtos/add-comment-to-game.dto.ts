import { IsNotEmpty } from "class-validator";
import { CreateCommentDto } from "./create-comment.dto";

export class AddCommentToGameDto extends CreateCommentDto {
  @IsNotEmpty()
  readonly gameId: string;
}
