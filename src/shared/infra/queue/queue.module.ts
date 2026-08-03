import { BullModule } from "@nestjs/bullmq";
import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ActivityModule } from "@/modules/activity/activity.module";
import { CatchupModule } from "@/modules/catchup/catchup.module";
import { NotificationModule } from "@/modules/notification/notification.module";
import { ACTIVITY_QUEUE, CATCHUP_QUEUE, EMAIL_QUEUE, NOTIFICATION_QUEUE } from "@/shared/constants/queue";
import { EmailModule } from "../email/email.module";
import { ActivityProcessor } from "./processors/activity.processor";
import { CatchupProcessor } from "./processors/catchup.processor";
import { EmailProcessor } from "./processors/email.processor";
import { NotificationProcessor } from "./processors/notification.processor";
import { QueueService } from "./queue.service";

@Global()
@Module({
  imports: [
    EmailModule,
    ActivityModule,
    NotificationModule,
    CatchupModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>("REDIS_URL"),
        },
        defaultJobOptions: {
          attempts: 4,
          backoff: {
            type: "fixed",
            delay: 5 * 60 * 1000,
          },
          removeOnFail: true,
          removeOnComplete: true,
        },
      }),
    }),
    BullModule.registerQueue({ name: ACTIVITY_QUEUE }),
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE }),
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
    BullModule.registerQueue({ name: CATCHUP_QUEUE }),
  ],
  controllers: [],
  providers: [QueueService, ActivityProcessor, NotificationProcessor, EmailProcessor, CatchupProcessor],
  exports: [QueueService],
})
export class QueueModule {}
