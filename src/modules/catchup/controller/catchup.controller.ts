import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { GetCatchupFeedDto } from "../dto/get-catchup-feed.dto";
import { CatchupFeedService } from "../service/catchup-feed.service";

@ApiTags("Catchup")
@Controller("/catchup")
@UseGuards(AuthGuard)
export class CatchupController {
  constructor(private readonly catchupFeedService: CatchupFeedService) {}

  @Get("/feed")
  async getFeed(@Session() session: UserSession, @Query() query: GetCatchupFeedDto) {
    const feed = await this.catchupFeedService.getFeed({ ...query, userId: session.user.id });

    return { feed };
  }
}
