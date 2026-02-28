import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";

import { FeedEventService } from "@/modules/feed-event/feed-event.service";

@Processor("feed-event-queue")
export class FeedEventProcessor extends WorkerHost {
  private readonly logger = new Logger(FeedEventProcessor.name);

  constructor(private readonly feedEventService: FeedEventService) {
    super();
  }

  async process(job: Job) {
    if (job.name === "feed-event") {
      const { type, userId, metadata } = job.data;

      await this.feedEventService.createFeedEvent({ type, userId, metadata });
    }
  }

  @OnWorkerEvent("active")
  onActive(job: Job) {
    this.logger.log(`Processing job [feed-event-queue] | job=${job.id} name=${job.name} attempt=${job.attemptsMade + 1}`);
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job) {
    this.logger.log(`Job completed [feed-event-queue] | job=${job.id} name=${job.name}`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error) {
    if (!job) return;
    
    const maxAttempts = job.opts?.attempts ?? 1;
    const willRetry = job.attemptsMade < maxAttempts;

    if (willRetry) {
      this.logger.warn(
        `Job failed, retrying [feed-event-queue] | job=${job.id} name=${job.name} attempt=${job.attemptsMade}/${maxAttempts} error=${error.message}`,
      );
    } else {
      this.logger.error(
        `Job removed from queue after max attempts [feed-event-queue] | job=${job.id} name=${job.name} attempts=${job.attemptsMade}/${maxAttempts} error=${error.message}`,
      );
    }
  }
}
