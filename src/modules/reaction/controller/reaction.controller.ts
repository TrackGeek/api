import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { CreateReactionDto } from "../dto/create-reaction.dto";
import { GetReactionsDto } from "../dto/get-reactions.dto";
import { ReactionService } from "../service/reaction.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("Reaction")
@Controller("/reaction")
export class ReactionController {
  constructor(private readonly reactionService: ReactionService) {}

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addReactionToComment(@Session() session: UserSession, @Body() body: CreateReactionDto) {
    await this.reactionService.createReaction({
      ...body,
      userId: session.user.id,
    });
  }

  @Get("/")
  async getReactionsByCommentId(@Query() query: GetReactionsDto) {
    const reactions = await this.reactionService.getReactions(query);

    return { reactions };
  }

  @Delete("/:reactionId")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReaction(@Session() session: UserSession, @Param("reactionId", new ParseUUIDPipe()) reactionId: string) {
    await this.reactionService.deleteReaction({
      reactionId,
      userId: session.user.id,
    });
  }
}
