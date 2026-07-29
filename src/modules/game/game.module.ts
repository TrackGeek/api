import { Module } from "@nestjs/common";
import { GameController } from "./controller/game.controller";
import { GameProgressController } from "./controller/game-progress.controller";
import { GameReviewController } from "./controller/game-review.controller";
import { GameScreenshotController } from "./controller/game-screenshot.controller";
import { GameService } from "./service/game.service";
import { GameProgressService } from "./service/game-progress.service";
import { GameReviewService } from "./service/game-review.service";
import { GameScreenshotService } from "./service/game-screenshot.service";

@Module({
  imports: [],
  controllers: [GameController, GameReviewController, GameScreenshotController, GameProgressController],
  providers: [GameService, GameReviewService, GameScreenshotService, GameProgressService],
  exports: [GameService, GameReviewService, GameScreenshotService, GameProgressService],
})
export class GameModule {}
