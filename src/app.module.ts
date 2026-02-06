import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ResendModule, ResendService } from "nestjs-resend";
import { AuthModule as BetterAuthModule } from "@thallesp/nestjs-better-auth";
import { betterAuth } from "better-auth";

import { CommentModule } from "./modules/comment/comment.module";
import { GameModule } from "./modules/game/game.module";
import { ReactionModule } from "./modules/reaction/reaction.module";
import { ProfileModule } from "./modules/profile/profile.module";
import { CacheModule } from "./shared/infra/cache/cache.module";
import { UploadModule } from "./shared/infra/upload/upload.module";
import { DatabaseModule } from "./shared/infra/database/database.module";
import { DatabaseService } from "./shared/infra/database/database.service";
import { getAuthConfig } from "./modules/auth/config/auth.config";
import { IntegrationsModule } from "./shared/infra/integrations/integrations.module";
import { MovieModule } from "./modules/movie/movie.module";
import { TVShowModule } from "./modules/tv-show/tv-show.module";
import { UserModule } from './modules/user/user.module';
import { UserService } from './modules/user/user.service';

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
		DatabaseModule,
		CacheModule,
		IntegrationsModule,
		UploadModule,
		UserModule,
		BetterAuthModule.forRootAsync({
			disableGlobalAuthGuard: true,
			isGlobal: true,
			inject: [ConfigService, ResendService, UserService],
			useFactory: async (
				configService: ConfigService,
				resendService: ResendService,
				databaseService: DatabaseService,
				userService: UserService
			) => ({
				auth: betterAuth(
					getAuthConfig({
						configService,
						resendService,
						databaseService,
						userService,
					}),
				),
			}),
		}),
		ProfileModule,
		CommentModule,
		ReactionModule,
		GameModule,
		MovieModule,
		TVShowModule,
	],
	providers: [],
	controllers: [],
	exports: [],
})
export class AppModule {}
