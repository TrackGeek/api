import { Module } from "@nestjs/common";

import { GameProgressController } from "./controller/game-progress.controller";
import { GameProgressService } from "./service/game-progress.service";
import { GameReviewController } from "./controller/game-review.controller";
import { GameReviewService } from "./service/game-review.service";
import { GameReviewScreenshotController } from "./controller/game-review-screenshot.controller";
import { GameReviewScreenshotService } from "./service/game-review-screenshot.service";
import { GameController } from "./controller/game.controller";
import { GameService } from "./service/game.service";

@Module({
  imports: [],
  controllers: [GameController, GameReviewController, GameReviewScreenshotController, GameProgressController],
  providers: [GameService, GameReviewService, GameReviewScreenshotService, GameProgressService],
  exports: [GameService, GameReviewService, GameReviewScreenshotService, GameProgressService],
})
export class GameModule {}
