import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";

import { EmailService } from "@/shared/infra/email/email.service";
import { EMAIL_QUEUE } from "@/shared/constants/queue";
import { MAGIC_LINK_JOB, RESET_PASSWORD_JOB } from '@/shared/constants/job';

@Processor(EMAIL_QUEUE, { concurrency: 10 })
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job) {
    if (job.name === MAGIC_LINK_JOB) {
      await this.emailService.sendMagicLinkEmail(job.data);

      return;
    }

    if (job.name === RESET_PASSWORD_JOB) {
      await this.emailService.sendResetPasswordEmail(job.data);

      return;
    }

    throw new Error(`Unsupported email job name: ${job.name}`);
  }

  @OnWorkerEvent("active")
  onActive(job: Job) {
    this.logger.log(`Processing job [${EMAIL_QUEUE}] | job=${job.id} name=${job.name} attempt=${job.attemptsMade + 1}`);
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job) {
    this.logger.log(`Job completed [${EMAIL_QUEUE}] | job=${job.id} name=${job.name}`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error) {
    if (!job) return;

    const maxAttempts = job.opts?.attempts ?? 1;
    const willRetry = job.attemptsMade < maxAttempts;

    if (willRetry) {
      this.logger.warn(
        `Job failed, retrying [${EMAIL_QUEUE}] | job=${job.id} name=${job.name} attempt=${job.attemptsMade}/${maxAttempts} error=${error.message}`,
      );
    } else {
      this.logger.error(
        `Job removed from queue after max attempts [${EMAIL_QUEUE}] | job=${job.id} name=${job.name} attempts=${job.attemptsMade}/${maxAttempts} error=${error.message}`,
      );
    }
  }
}
