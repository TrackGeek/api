import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthModule as BetterAuthModule } from "@thallesp/nestjs-better-auth";
import { betterAuth } from "better-auth";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { QueueService } from "@/shared/infra/queue/queue.service";
import { StripeService } from "../payment/service/stripe.service";
import { ProfileService } from "../profile/service/profile.service";
import { UserService } from "../user/service/user.service";
import { getAuthConfig } from "./config/auth.config";

@Global()
@Module({
  imports: [
    BetterAuthModule.forRootAsync({
      disableGlobalAuthGuard: true,
      isGlobal: true,
      inject: [ConfigService, DatabaseService, UserService, ProfileService, QueueService, StripeService],
      useFactory: async (
        configService: ConfigService,
        databaseService: DatabaseService,
        userService: UserService,
        profileService: ProfileService,
        queueService: QueueService,
        stripeService: StripeService,
      ) => ({
        auth: betterAuth(
          getAuthConfig({
            configService,
            databaseService,
            userService,
            profileService,
            queueService,
            stripeService,
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
