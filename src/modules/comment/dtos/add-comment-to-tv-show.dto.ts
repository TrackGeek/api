import { IsNotEmpty } from "class-validator";
import { CreateCommentDto } from "./create-comment.dto";

export class AddCommentToTVShowDto extends CreateCommentDto {
  @IsNotEmpty()
  readonly tvShowId: string;
}
