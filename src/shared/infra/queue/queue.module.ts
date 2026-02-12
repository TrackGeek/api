import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";

import { FeedEventProcessor } from "./processors/feed-event.processor";
import { EmailProcessor } from "./processors/email.processor";
import { QueueService } from "./queue.service";
import { EmailModule } from "../email/email.module";
import { FeedEventModule } from "@/modules/feed-event/feed-event.module";

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
			}),
		}),
		BullModule.registerQueue({ name: "feed-event-queue" }),
		BullModule.registerQueue({ name: "email-queue" }),
	],
	controllers: [],
	providers: [QueueService, FeedEventProcessor, EmailProcessor],
	exports: [QueueService],
})
export class QueueModule {}
