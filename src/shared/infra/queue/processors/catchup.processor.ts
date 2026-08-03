import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { CatchupService } from "@/modules/catchup/service/catchup.service";
import { CATCHUP_DAILY_JOB } from "@/shared/constants/job";
import { CATCHUP_QUEUE } from "@/shared/constants/queue";

export interface CatchupDailyJobData {
  readonly runDate?: string;
}

@Processor(CATCHUP_QUEUE, { concurrency: 1 })
export class CatchupProcessor extends WorkerHost {
  private readonly logger = new Logger(CatchupProcessor.name);

  constructor(private readonly catchupService: CatchupService) {
    super();
  }

  async process(job: Job) {
    if (job.name === CATCHUP_DAILY_JOB) {
      const { runDate } = (job.data ?? {}) as CatchupDailyJobData;

      await this.catchupService.runDailyCatchup(runDate ? new Date(runDate) : new Date());

      return;
    }

    throw new Error(`Unsupported catch-up job name: ${job.name}`);
  }

  @OnWorkerEvent("active")
  onActive(job: Job) {
    this.logger.log(`Processing job [${CATCHUP_QUEUE}] | job=${job.id} name=${job.name} attempt=${job.attemptsMade + 1}`);
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job) {
    this.logger.log(`Job completed [${CATCHUP_QUEUE}] | job=${job.id} name=${job.name}`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error) {
    if (!job) return;

    const maxAttempts = job.opts?.attempts ?? 1;
    const willRetry = job.attemptsMade < maxAttempts;

    if (willRetry) {
      this.logger.warn(
        `Job failed, retrying [${CATCHUP_QUEUE}] | job=${job.id} name=${job.name} attempt=${job.attemptsMade}/${maxAttempts} error=${error.message}`,
      );
    } else {
      this.logger.error(
        `Job removed from queue after max attempts [${CATCHUP_QUEUE}] | job=${job.id} name=${job.name} attempts=${job.attemptsMade}/${maxAttempts} error=${error.message}`,
      );
    }
  }
}
