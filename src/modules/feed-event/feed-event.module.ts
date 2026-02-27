import { Module } from "@nestjs/common";
import { FeedEventController } from "./feed-event.controller";
import { FeedEventService } from "./feed-event.service";

@Module({
  imports: [],
  controllers: [FeedEventController],
  providers: [FeedEventService],
  exports: [FeedEventService],
})
export class FeedEventModule {}
