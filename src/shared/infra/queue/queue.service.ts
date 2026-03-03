import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { FeedEventDto } from "@/modules/feed-event/dtos/feed-event.dto";
import { MagicLinkEmailDto } from "../email/dtos/magic-link-email.dto";
import { ResetPasswordEmailDto } from "../email/dtos/reset-password-email.dto";
import { EMAIL_QUEUE, FEED_EVENT_QUEUE } from '@/shared/constants/queue';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(EMAIL_QUEUE)
    private readonly emailQueue: Queue,
    @InjectQueue(FEED_EVENT_QUEUE)
    private readonly feedEventQueue: Queue,
  ) {}

  private async addJob(queue: Queue, jobName: string, data: unknown) {
    try {
      const job = await queue.add(jobName, data);

      this.logger.log(`Job added to queue [${queue.name}] | job=${job.id} name=${jobName}`);
    } catch (error) {
      this.logger.error(`Failed to add job to queue [${queue.name}] | error=${error.message}`);
    }
  }

  async toFeedEventJob(feedEventDto: FeedEventDto) {
    await this.addJob(this.feedEventQueue, "feed-event", feedEventDto);
  }

  async toMagicLinkJob(magicLinkEmailDto: MagicLinkEmailDto) {
    await this.addJob(this.emailQueue, "magic-link", magicLinkEmailDto);
  }

  async toResetPasswordJob(resetPasswordEmailDto: ResetPasswordEmailDto) {
    await this.addJob(this.emailQueue, "reset-password", resetPasswordEmailDto);
  }
}
