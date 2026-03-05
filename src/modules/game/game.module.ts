import { Module } from "@nestjs/common";

import { GameProgressController } from "./controller/game-progress.controller";
import { GameProgressService } from "./service/game-progress.service";
import { GameReviewController } from "./controller/game-review.controller";
import { GameReviewService } from "./service/game-review.service";
import { GameController } from "./controller/game.controller";
import { GameService } from "./service/game.service";

@Module({
  imports: [],
  controllers: [GameController, GameReviewController, GameProgressController],
  providers: [GameService, GameReviewService, GameProgressService],
  exports: [GameService, GameReviewService, GameProgressService],
})
export class GameModule {}
