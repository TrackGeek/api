import { Module } from "@nestjs/common";

import { FeedEventService } from "./feed-event.service";
import { FeedEventController } from "./feed-event.controller";

@Module({
	imports: [],
	controllers: [FeedEventController],
	providers: [FeedEventService],
	exports: [FeedEventService],
})
export class FeedEventModule {}
