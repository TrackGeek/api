import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CacheModule } from "@/shared/infra/cache/cache.module";
import { ImgBBModule } from "@/shared/infra/imgbb/imgbb.module";
import { PrismaModule } from "@/shared/infra/prisma/prisma.module";
import { UserModule } from "../user/auth.module";
import { GameController } from "./game.controller";
import { GameService } from "./game.service";

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
export class GameModule { }
