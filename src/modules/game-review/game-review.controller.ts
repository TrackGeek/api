import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { CreateGameReviewDto } from "./dtos/create-game-review.dto";
import { GetGameReviewsDto } from "./dtos/get-game-reviews.dto";
import { GameReviewService } from "./game-review.service";

@Controller("/game/review")
export class GameReviewController {
  constructor(private readonly gameReviewService: GameReviewService) {}

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createGameReview(@Session() session: UserSession, @Body() body: CreateGameReviewDto) {
    await this.gameReviewService.createGameReview({
      ...body,
      userId: session.user.id,
    });
  }

  @Get("/")
  async getGameReviews(@Query() query: GetGameReviewsDto) {
    const gameReviews = await this.gameReviewService.getGameReviews(query);

    return { gameReviews };
  }

  @Get("/:gameReviewId")
  async getGameReviewById(@Param("gameReviewId", new ParseUUIDPipe()) gameReviewId: string) {
    const gameReview = await this.gameReviewService.getGameReviewById(gameReviewId);

    return { gameReview };
  }

  @Patch("/:gameReviewId")
  @UseGuards(AuthGuard)
  async updateGameReview(
    @Param("gameReviewId", new ParseUUIDPipe()) gameReviewId: string,
    @Session() session: UserSession,
    @Body() body: CreateGameReviewDto,
  ) {
    await this.gameReviewService.updateGameReview({
      ...body,
      gameReviewId,
      userId: session.user.id,
    });
  }

  @Delete("/:gameReviewId")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGameReview(
    @Param("gameReviewId", new ParseUUIDPipe()) gameReviewId: string,
    @Session() session: UserSession,
  ) {
    await this.gameReviewService.deleteGameReview({
      gameReviewId,
      userId: session.user.id,
    });
  }
}
