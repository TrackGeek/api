import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";

import { AddReactionToCommentDto } from "./dtos/add-reaction-to-comment.dto";
import { AddReactionToFeedEventDto } from "./dtos/add-reaction-to-feed-event.dto";
import { ReactionService } from "./reaction.service";

@Controller("reaction")
export class ReactionController {
  constructor(private readonly reactionService: ReactionService) {}

  @Post("/comment")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addReactionToComment(@Session() session: UserSession, @Body() body: AddReactionToCommentDto) {
    await this.reactionService.addReactionToComment({
      ...body,
      userId: session.user.id,
    });
  }

  @Post("/feed")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addReactionToFeedEvent(@Session() session: UserSession, @Body() body: AddReactionToFeedEventDto) {
    await this.reactionService.addReactionToFeedEvent({
      ...body,
      userId: session.user.id,
    });
  }

  @Get("/comment/:commentId")
  async getReactionsByCommentId(@Param("commentId", new ParseUUIDPipe()) commentId: string) {
    const reactions = await this.reactionService.getReactionsByCommentId(commentId);

    return { reactions };
  }

  @Get("/feed/:feedEventId")
  async getReactionsByFeedEventId(@Param("feedEventId", new ParseUUIDPipe()) feedEventId: string) {
    const reactions = await this.reactionService.getReactionsByFeedEventId(feedEventId);

    return { reactions };
  }
}
