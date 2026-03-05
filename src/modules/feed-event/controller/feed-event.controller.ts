import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { GetFeedEventsDto } from "../dto/get-feed-events.dto";
import { GetFeedEventsByUserDto } from "../dto/get-feed-events-by-user.dto";
import { FeedEventService } from "../service/feed-event.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("Feed Event")
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
