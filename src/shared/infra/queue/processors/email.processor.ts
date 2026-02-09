import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

import { EmailService } from "@/shared/infra/email/email.service";
import { Logger } from '@nestjs/common';

@Processor("email-queue")
export class EmailProcessor extends WorkerHost {
	private readonly logger = new Logger(EmailProcessor.name);
	
	constructor(private readonly emailService: EmailService) {
		super();
	}

	async process(job: Job) {
		if (job.name === "send-magic-link") {
			this.logger.log(`Processing job ${job.id} of type ${job.name} with data: ${JSON.stringify(job.data)}`);
			
			await this.emailService.sendMagicLink(job.data);
			
			this.logger.log(`Finished processing job ${job.id} of type ${job.name}`);
		}
	}
}
