import { Injectable } from "@nestjs/common";
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { SendMagicLinkDto } from '../email/dtos/send-magic-link.dto';
import { FeedEventDto } from '@/modules/feed-event/dtos/feed-event.dto';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('email-queue')
    private readonly emailQueue: Queue,
    @InjectQueue('feed-event-queue')
    private readonly feedEventQueue: Queue,
  ) {}

  async sendMagicLinkQueue(emailDto: SendMagicLinkDto) {
    await this.emailQueue.add('send-magic-link', emailDto);
  }
  
  async addFeedEventQueue(feedEventDto: FeedEventDto) {
    await this.feedEventQueue.add('feed-event', feedEventDto);
  }
}
