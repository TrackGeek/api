import { Module } from "@nestjs/common";
import { FeedEventController } from "./controller/feed-event.controller";
import { FeedEventService } from "./service/feed-event.service";

@Module({
  imports: [],
  controllers: [FeedEventController],
  providers: [FeedEventService],
  exports: [FeedEventService],
})
export class FeedEventModule {}
