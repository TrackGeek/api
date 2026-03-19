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
import { ApiTags } from "@nestjs/swagger";
import { CreateGameReviewScreenshotDto } from "../dto/create-game-review-screenshot.dto";
import { GetGameReviewScreenshotsDto } from "../dto/get-game-review-screenshots.dto";
import { GameReviewScreenshotService } from "../service/game-review-screenshot.service";

@ApiTags("Game")
@Controller("/game/review/screenshot")
export class GameReviewScreenshotController {
  constructor(private readonly gameReviewScreenshotService: GameReviewScreenshotService) {}

  @Get("/")
  async getGameReviewScreenshots(@Query() query: GetGameReviewScreenshotsDto) {
    const screenshots = await this.gameReviewScreenshotService.getGameReviewScreenshots(query);

    return { screenshots };
  }

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createGameReviewScreenshot(@Session() session: UserSession, @Body() body: CreateGameReviewScreenshotDto) {
    await this.gameReviewScreenshotService.createGameReviewScreenshot({
      ...body,
      userId: session.user.id,
    });
  }

  @Delete("/:screenshotId")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGameReviewScreenshot(
    @Param("screenshotId", new ParseUUIDPipe()) screenshotId: string,
    @Session() session: UserSession,
  ) {
    await this.gameReviewScreenshotService.deleteGameReviewScreenshot({
      screenshotId,
      userId: session.user.id,
    });
  }
}
