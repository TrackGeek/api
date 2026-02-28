import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";

import { EmailService } from "@/shared/infra/email/email.service";

@Processor("email-queue")
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job) {
    if (job.name === "magic-link") {
      await this.emailService.sendMagicLinkEmail(job.data);
    }

    if (job.name === "reset-password") {
      await this.emailService.sendResetPasswordEmail(job.data);
    }
  }

  @OnWorkerEvent("active")
  onActive(job: Job) {
    this.logger.log(`Processing job [email-queue] | job=${job.id} name=${job.name} attempt=${job.attemptsMade + 1}`);
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job) {
    this.logger.log(`Job completed [email-queue] | job=${job.id} name=${job.name}`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error) {
    if (!job) return;
    
    const maxAttempts = job.opts?.attempts ?? 1;
    const willRetry = job.attemptsMade < maxAttempts;

    if (willRetry) {
      this.logger.warn(
        `Job failed, retrying [email-queue] | job=${job.id} name=${job.name} attempt=${job.attemptsMade}/${maxAttempts} error=${error.message}`,
      );
    } else {
      this.logger.error(
        `Job removed from queue after max attempts [email-queue] | job=${job.id} name=${job.name} attempts=${job.attemptsMade}/${maxAttempts} error=${error.message}`,
      );
    }
  }
}
