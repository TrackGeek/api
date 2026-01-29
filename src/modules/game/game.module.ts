import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "@/infra/prisma/prisma.module";
import { CacheModule } from "@/infra/cache/cache.module";
import { GameController } from "./game.controller";
import { GameService } from "./game.service";
import { ImgBBModule } from "@/infra/imgbb/imgbb.module";
import { UserModule } from "../user/auth.module";

@Module({
	imports: [
		PrismaModule,
		HttpModule,
		ConfigModule,
		CacheModule,
		ImgBBModule,
		UserModule,
	],
	controllers: [GameController],
	providers: [GameService],
	exports: [GameService],
})
export class GameModule {}
