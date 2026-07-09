import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { CreateActivityDto } from "@/modules/activity/dto/activity.dto";
import { ActivityService } from "@/modules/activity/service/activity.service";
import { ACTIVITY_JOB } from "@/shared/constants/job";
import { ACTIVITY_QUEUE } from "@/shared/constants/queue";

export type ActivityJobData = CreateActivityDto;

@Processor(ACTIVITY_QUEUE, { concurrency: 10 })
export class ActivityProcessor extends WorkerHost {
  private readonly logger = new Logger(ActivityProcessor.name);

  constructor(private readonly activityService: ActivityService) {
    super();
  }

  async process(job: Job) {
    if (job.name === ACTIVITY_JOB) {
      await this.activityService.createActivity(job.data as ActivityJobData);

      return;
    }

    throw new Error(`Unsupported activity job name: ${job.name}`);
  }

  @OnWorkerEvent("active")
  onActive(job: Job) {
    this.logger.log(
      `Processing job [${ACTIVITY_QUEUE}] | job=${job.id} name=${job.name} attempt=${job.attemptsMade + 1}`,
    );
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job) {
    this.logger.log(`Job completed [${ACTIVITY_QUEUE}] | job=${job.id} name=${job.name}`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error) {
    if (!job) return;

    const maxAttempts = job.opts?.attempts ?? 1;
    const willRetry = job.attemptsMade < maxAttempts;

    if (willRetry) {
      this.logger.warn(
        `Job failed, retrying [${ACTIVITY_QUEUE}] | job=${job.id} name=${job.name} attempt=${job.attemptsMade}/${maxAttempts} error=${error.message}`,
      );
    } else {
      this.logger.error(
        `Job removed from queue after max attempts [${ACTIVITY_QUEUE}] | job=${job.id} name=${job.name} attempts=${job.attemptsMade}/${maxAttempts} error=${error.message}`,
      );
    }
  }
}
