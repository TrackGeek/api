import { Module } from "@nestjs/common";

import { GameController } from "./game.controller";
import { GameService } from "./game.service";
import { ProfileModule } from "../profile/profile.module";

@Module({
	imports: [ProfileModule],
	controllers: [GameController],
	providers: [GameService],
	exports: [GameService],
})
export class GameModule {}
