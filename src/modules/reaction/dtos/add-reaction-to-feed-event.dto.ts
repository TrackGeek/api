import { IsNotEmpty } from "class-validator";
import { CreateReactionDto } from "./create-reaction.dto";

export class AddReactionToFeedEventDto extends CreateReactionDto {
  @IsNotEmpty()
  readonly feedEventId: string;
}
