import { IsNotEmpty } from "class-validator";
import { CreateCommentDto } from "./create-comment.dto";

export class AddCommentToMovieDto extends CreateCommentDto {
  @IsNotEmpty()
  readonly movieId: string;
}
