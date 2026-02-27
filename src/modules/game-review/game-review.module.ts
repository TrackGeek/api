import { Module } from "@nestjs/common";

import { GameReviewController } from "./game-review.controller";
import { GameReviewService } from "./game-review.service";

@Module({
	imports: [],
	controllers: [GameReviewController],
	providers: [GameReviewService],
	exports: [GameReviewService],
})
export class GameReviewModule {}
