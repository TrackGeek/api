import { Module } from "@nestjs/common";
import { GameController } from "./controller/game.controller";
import { GameProgressController } from "./controller/game-progress.controller";
import { GameReviewController } from "./controller/game-review.controller";
import { GameReviewScreenshotController } from "./controller/game-review-screenshot.controller";
import { GameService } from "./service/game.service";
import { GameProgressService } from "./service/game-progress.service";
import { GameReviewService } from "./service/game-review.service";
import { GameReviewScreenshotService } from "./service/game-review-screenshot.service";

@Module({
  imports: [],
  controllers: [GameController, GameReviewController, GameReviewScreenshotController, GameProgressController],
  providers: [GameService, GameReviewService, GameReviewScreenshotService, GameProgressService],
  exports: [GameService, GameReviewService, GameReviewScreenshotService, GameProgressService],
})
export class GameModule {}
