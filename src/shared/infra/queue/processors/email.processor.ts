import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

import { EmailService } from "@/shared/infra/email/email.service";

@Processor("email-queue")
export class EmailProcessor extends WorkerHost {
  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job) {
    if (job.name === "send-magic-link") {
      await this.emailService.sendMagicLink(job.data);
    }
  }
}
