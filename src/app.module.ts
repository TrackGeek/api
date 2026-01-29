import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ResendModule } from "nestjs-resend";

import { AuthModule } from "./modules/auth/auth.module";
import { GameModule } from "./modules/game/game.module";
import { UserModule } from "./modules/user/auth.module";

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
		AuthModule,
		UserModule,
		GameModule,
	],
	providers: [],
	controllers: [],
})
export class AppModule { }
