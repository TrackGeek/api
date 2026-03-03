import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { FeedEventDto } from "@/modules/feed-event/dtos/feed-event.dto";
import { MagicLinkEmailDto } from "../email/dtos/magic-link-email.dto";
import { ResetPasswordEmailDto } from "../email/dtos/reset-password-email.dto";

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue("email-queue")
    private readonly emailQueue: Queue,
    @InjectQueue("feed-event-queue")
    private readonly feedEventQueue: Queue,
  ) {}

  async toFeedEventJob(feedEventDto: FeedEventDto) {
    try {
      const job = await this.feedEventQueue.add("feed-event", feedEventDto);

      this.logger.log(`Job added to queue [feed-event-queue] | job=${job.id} name=feed-event`);
    } catch (error) {
      this.logger.error(`Failed to add job to queue [feed-event-queue] | error=${error.message}`);
    }
  }

  async toMagicLinkJob(magicLinkEmailDto: MagicLinkEmailDto) {
    try {
      const job = await this.emailQueue.add("magic-link", magicLinkEmailDto);

      this.logger.log(`Job added to queue [email-queue] | job=${job.id} name=magic-link`);
    } catch (error) {
      this.logger.error(`Failed to add job to queue [email-queue] | error=${error.message}`);
    }
  }

  async toResetPasswordJob(resetPasswordEmailDto: ResetPasswordEmailDto) {
    try {
      const job = await this.emailQueue.add("reset-password", resetPasswordEmailDto);

      this.logger.log(`Job added to queue [email-queue] | job=${job.id} name=reset-password`);
    } catch (error) {
      this.logger.error(`Failed to add job to queue [email-queue] | error=${error.message}`);
    }
  }
}
