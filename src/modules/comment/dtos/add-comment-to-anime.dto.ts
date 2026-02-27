import { IsNotEmpty } from "class-validator";
import { CreateCommentDto } from "./create-comment.dto";

export class AddCommentToAnimeDto extends CreateCommentDto {
  @IsNotEmpty()
  readonly animeId: string;
}
