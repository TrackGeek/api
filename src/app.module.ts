import { RedisModule } from "@liaoliaots/nestjs-redis";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ResendModule } from "nestjs-resend";

import { AuthModule } from "./modules/auth/auth.module";
import { GameModule } from "./modules/game/game.module";
import { UserModule } from "./modules/user/auth.module";

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		JwtModule.register({ global: true }),
		ResendModule.forRoot({ apiKey: process.env.RESEND_API_KEY! }),
		RedisModule.forRoot({
			config: {
				host: process.env.REDIS_HOST!,
				port: +process.env.REDIS_PORT!,
				password: process.env.REDIS_PASSWORD!,
			},
		}),
		AuthModule,
		UserModule,
		GameModule,
	],
	providers: [],
	controllers: [],
})
export class AppModule { }
