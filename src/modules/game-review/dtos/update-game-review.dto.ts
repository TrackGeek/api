import { CreateGameReviewDto } from "./create-game-review.dto";

export class UpdateGameReviewDto extends CreateGameReviewDto {
	readonly gameReviewId: string;
}
