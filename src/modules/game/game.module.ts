import { Module } from "@nestjs/common";

import { GameController } from "./game.controller";
import { GameService } from "./game.service";
import { UserModule } from "../user/user.module";

@Module({
	imports: [UserModule],
	controllers: [GameController],
	providers: [GameService],
	exports: [GameService],
})
export class GameModule {}
