import { BullModule } from "@nestjs/bullmq";
import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FeedEventModule } from "@/modules/feed-event/feed-event.module";
import { EmailModule } from "../email/email.module";
import { EmailProcessor } from "./processors/email.processor";
import { FeedEventProcessor } from "./processors/feed-event.processor";
import { QueueService } from "./queue.service";
import { EMAIL_QUEUE, FEED_EVENT_QUEUE } from "@/shared/constants/queue";

@Global()
@Module({
  imports: [
    EmailModule,
    FeedEventModule,
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
    BullModule.registerQueue({ name: FEED_EVENT_QUEUE }),
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
  ],
  controllers: [],
  providers: [QueueService, FeedEventProcessor, EmailProcessor],
  exports: [QueueService],
})
export class QueueModule {}
