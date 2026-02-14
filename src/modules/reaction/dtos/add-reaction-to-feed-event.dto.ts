import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";
import { CreateReactionDto } from "./create-reaction.dto";

export class AddReactionToFeedEventDto extends CreateReactionDto {
	@IsNotEmpty()
	@ApiProperty({ example: "FeedEvent identifier" })
	readonly feedEventId: string;
}
