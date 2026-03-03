import { Module } from "@nestjs/common";

import { GameProgressController } from "./game-progress.controller";
import { GameProgressService } from "./game-progress.service";

@Module({
  imports: [],
  controllers: [GameProgressController],
  providers: [GameProgressService],
  exports: [GameProgressService],
})
export class GameProgressModule {}
