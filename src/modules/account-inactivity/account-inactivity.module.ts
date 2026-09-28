import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ACCOUNT_INACTIVITY_QUEUE, AccountInactivityProcessor } from "./account-inactivity.processor";
import { AccountInactivityService } from "./account-inactivity.service";

@Module({
  imports: [BullModule.registerQueue({ name: ACCOUNT_INACTIVITY_QUEUE })],
  providers: [AccountInactivityService, AccountInactivityProcessor],
})
export class AccountInactivityModule {}
