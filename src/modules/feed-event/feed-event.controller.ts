import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { FeedEventService } from "./feed-event.service";
import { RateLimit } from "@/shared/decorators/ratelimit.decorator";
import { RateLimitGuard } from "@/shared/guards/ratelimit.guard";

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller("feed")
export class FeedEventController {
	constructor(private readonly feedEventService: FeedEventService) {}
	
	@Get('/global')
	async getFeedEvents() {
		const feedEvents = await this.feedEventService.getFeedEvents();
		
		return { feedEvents };
	}
	
	@Get('/user')
	@UseGuards(AuthGuard)
	async getFeedEventsByUserId(
		@Session() session: UserSession,
	) {
		const feedEvents = await this.feedEventService.getFeedEventsByUserId(session.user.id);
		
		return { feedEvents };
	}
}
