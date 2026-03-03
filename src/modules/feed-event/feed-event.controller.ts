import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { GetFeedEventsDto } from "./dtos/get-feed-events.dto";
import { GetFeedEventsByUserDto } from "./dtos/get-feed-events-by-user.dto";
import { FeedEventService } from "./feed-event.service";

@Controller("/feed")
export class FeedEventController {
  constructor(private readonly feedEventService: FeedEventService) {}

  @Get("/global")
  async getFeedEvents(@Query() query: GetFeedEventsDto) {
    const feedEvents = await this.feedEventService.getFeedEvents(query);

    return { feedEvents };
  }

  @Get("/user")
  @UseGuards(AuthGuard)
  async getFeedEventsByUserId(@Session() session: UserSession, @Query() query: GetFeedEventsByUserDto) {
    const feedEvents = await this.feedEventService.getFeedEventsByUserId({
      ...query,
      userId: session.user.id,
    });

    return { feedEvents };
  }
}
