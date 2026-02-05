import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ResendModule, ResendService } from "nestjs-resend";
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { betterAuth } from 'better-auth';

import { CommentModule } from "./modules/comment/comment.module";
import { GameModule } from "./modules/game/game.module";
import { ReactionModule } from "./modules/reaction/reaction.module";
import { ProfileModule } from "./modules/profile/profile.module";
import { CacheModule } from "./shared/infra/cache/cache.module";
import { UploadModule } from "./shared/infra/upload/upload.module";
import { DatabaseModule } from "./shared/infra/database/database.module";
import { DatabaseService } from './shared/infra/database/database.service';
import { getAuthConfig } from './shared/config/auth.config';
import { UploadService } from './shared/infra/upload/upload.service';
import { IntegrationsModule } from './shared/infra/integrations/integrations.module';

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
		AuthModule.forRootAsync({
			isGlobal: true,
			inject: [ConfigService, DatabaseService, UploadService, ResendService],
			useFactory: async (
				configService: ConfigService,
				databaseService: DatabaseService,
				uploadService: UploadService,
				resendService: ResendService
			) => ({
				auth: betterAuth(getAuthConfig({
					configService,
					databaseService,
					uploadService,
					resendService
				}))
			})
		}),
		ProfileModule,
		GameModule,
		CommentModule,
		ReactionModule,
	],
	providers: [],
	controllers: [],
	exports: [],
})
export class AppModule {}
