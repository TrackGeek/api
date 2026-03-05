import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { JobsOptions, Queue } from "bullmq";
import { FeedEventDto } from "@/modules/feed-event/dtos/feed-event.dto";
import { MagicLinkEmailDto } from "../email/dtos/magic-link-email.dto";
import { ResetPasswordEmailDto } from "../email/dtos/reset-password-email.dto";
import { EMAIL_QUEUE, FEED_EVENT_QUEUE } from "@/shared/constants/queue";
import { FEED_EVENT_JOB, MAGIC_LINK_JOB, RESET_PASSWORD_JOB, FEED_EVENT_FLUSH_AGGREGATION_JOB } from '@/shared/constants/job';

type QueueName = typeof EMAIL_QUEUE | typeof FEED_EVENT_QUEUE;

type JobName = typeof FEED_EVENT_JOB | typeof MAGIC_LINK_JOB | typeof RESET_PASSWORD_JOB | typeof FEED_EVENT_FLUSH_AGGREGATION_JOB;

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(EMAIL_QUEUE)
    private readonly emailQueue: Queue,
    @InjectQueue(FEED_EVENT_QUEUE)
    private readonly feedEventQueue: Queue,
  ) {}

  async addJob(queueName: QueueName, jobName: JobName, data: unknown, options?: JobsOptions) {
    try {
      const queues = {
        [EMAIL_QUEUE]: this.emailQueue,
        [FEED_EVENT_QUEUE]: this.feedEventQueue,
      } as const
      
      const job = await queues[queueName].add(jobName, data, options);

      this.logger.log(`Job added to queue [${queueName}] | job=${job.id} name=${jobName}`);
    } catch (error) {
      this.logger.error(`Failed to add job to queue [${queueName}] | error=${error.message}`);
    }
  }

  async toFeedEventJob(feedEventDto: FeedEventDto) {
    await this.addJob(FEED_EVENT_QUEUE, FEED_EVENT_JOB, feedEventDto);
  }
  
  async toFeedEventFlushAggregationJob(feedEventFlushAggregationDto: { aggKey: string }, options?: JobsOptions) {
    await this.addJob(FEED_EVENT_QUEUE, FEED_EVENT_FLUSH_AGGREGATION_JOB, feedEventFlushAggregationDto, options);
  }

  async toMagicLinkJob(magicLinkEmailDto: MagicLinkEmailDto) {
    await this.addJob(EMAIL_QUEUE, MAGIC_LINK_JOB, magicLinkEmailDto);
  }

  async toResetPasswordJob(resetPasswordEmailDto: ResetPasswordEmailDto) {
    await this.addJob(EMAIL_QUEUE, RESET_PASSWORD_JOB, resetPasswordEmailDto);
  }
}
