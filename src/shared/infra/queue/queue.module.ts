import { BullModule } from "@nestjs/bullmq";
import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ActivityModule } from "@/modules/activity/activity.module";
import { NotificationModule } from "@/modules/notification/notification.module";
import { ACTIVITY_QUEUE, EMAIL_QUEUE, NOTIFICATION_QUEUE } from "@/shared/constants/queue";
import { EmailModule } from "../email/email.module";
import { ActivityProcessor } from "./processors/activity.processor";
import { EmailProcessor } from "./processors/email.processor";
import { NotificationProcessor } from "./processors/notification.processor";
import { QueueService } from "./queue.service";

@Global()
@Module({
  imports: [
    EmailModule,
    ActivityModule,
    NotificationModule,
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
  ],
  controllers: [],
  providers: [QueueService, ActivityProcessor, NotificationProcessor, EmailProcessor],
  exports: [QueueService],
})
export class QueueModule {}
