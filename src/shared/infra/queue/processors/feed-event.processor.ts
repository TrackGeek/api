import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

import { FeedEventService } from '@/modules/feed-event/feed-event.service';

@Processor("feed-event-queue")
export class FeedEventProcessor extends WorkerHost {
	constructor(
		private readonly feedEventService: FeedEventService,
	) {
		super();
	}
	
	async process(job: Job) {
		if (job.name === "feed-event") {
			const { type, userId, metadata } = job.data;

			await this.feedEventService.createFeedEvent({ type, userId, metadata });
		}
	}
}
