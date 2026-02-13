import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthModule as BetterAuthModule } from "@thallesp/nestjs-better-auth";
import { betterAuth } from "better-auth";

import { getAuthConfig } from "./config/auth.config";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { UserService } from "../user/user.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { ProfileService } from '../profile/profile.service';

@Global()
@Module({
	imports: [
		BetterAuthModule.forRootAsync({
			disableGlobalAuthGuard: true,
			isGlobal: true,
			inject: [ConfigService, DatabaseService, UserService, ProfileService, QueueService],
			useFactory: async (
				configService: ConfigService,
				databaseService: DatabaseService,
				userService: UserService,
				profileService: ProfileService,
				queueService: QueueService,
			) => ({
				auth: betterAuth(
					getAuthConfig({
						configService,
						databaseService,
						userService,
						profileService,
						queueService,
					}),
				),
			}),
		}),
	],
	providers: [],
	controllers: [],
	exports: [],
})
export class AuthModule {}
