import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { FeedEventDto } from "@/modules/feed-event/dtos/feed-event.dto";
import { SendMagicLinkDto } from "../email/dtos/send-magic-link.dto";

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue("email-queue")
    private readonly emailQueue: Queue,
    @InjectQueue("feed-event-queue")
    private readonly feedEventQueue: Queue,
  ) {}

  async toSendMagicLinkQueue(emailDto: SendMagicLinkDto) {
    await this.emailQueue.add("send-magic-link", emailDto);
  }

  async toFeedEventQueue(feedEventDto: FeedEventDto) {
    await this.feedEventQueue.add("feed-event", feedEventDto);
  }
}
