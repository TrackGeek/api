import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthModule as BetterAuthModule } from "@thallesp/nestjs-better-auth";
import { betterAuth } from "better-auth";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { UserService } from "../user/service/user.service";
import { getAuthConfig } from "./config/auth.config";
import { ProfileService } from "../profile/service/profile.service";

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
