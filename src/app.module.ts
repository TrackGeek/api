import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ResendModule } from "nestjs-resend";

import { AuthModule } from "./modules/auth/auth.module";
import { GameModule } from "./modules/game/game.module";
import { CommentModule } from "./modules/comment/comment.module";
import { ReactionModule } from "./modules/reaction/reaction.module";
import { UserModule } from "./modules/user/user.module";
import { CacheModule } from "./shared/infra/cache/cache.module";
import { ImgBBModule } from "./shared/infra/imgbb/imgbb.module";
import { PrismaModule } from "./shared/infra/prisma/prisma.module";
import { HttpModule } from "@nestjs/axios";

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		JwtModule.register({ global: true }),
		ResendModule.forRootAsync({
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				apiKey: configService.get<string>("RESEND_API_KEY")!,
			}),
		}),
		HttpModule.register({ global: true }),
		CacheModule,
		ImgBBModule,
		PrismaModule,
		AuthModule,
		UserModule,
		GameModule,
		CommentModule,
		ReactionModule,
	],
	providers: [],
	controllers: [],
	exports: [],
})
export class AppModule {}
