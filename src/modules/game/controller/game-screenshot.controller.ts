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
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { CreateGameScreenshotDto } from "../dto/create-game-screenshot.dto";
import { GetGameScreenshotsDto } from "../dto/get-game-screenshots.dto";
import { UpdateGameScreenshotDto } from "../dto/update-game-screenshot.dto";
import { GameScreenshotService } from "../service/game-screenshot.service";

@ApiTags("Game")
@Controller("/game/screenshot")
export class GameScreenshotController {
  constructor(private readonly gameScreenshotService: GameScreenshotService) {}

  @Get("/")
  async getGameScreenshots(@Query() query: GetGameScreenshotsDto) {
    const screenshots = await this.gameScreenshotService.getGameScreenshots(query);

    return { screenshots };
  }

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createGameScreenshot(@Session() session: UserSession, @Body() body: CreateGameScreenshotDto) {
    const screenshot = await this.gameScreenshotService.createGameScreenshot({
      ...body,
      userId: session.user.id,
    });

    return { screenshot };
  }

  @Patch("/:screenshotId")
  @UseGuards(AuthGuard)
  async updateGameScreenshot(
    @Param("screenshotId", new ParseUUIDPipe()) screenshotId: string,
    @Session() session: UserSession,
    @Body() body: UpdateGameScreenshotDto,
  ) {
    const screenshot = await this.gameScreenshotService.updateGameScreenshot({
      ...body,
      screenshotId,
      userId: session.user.id,
    });

    return { screenshot };
  }

  @Delete("/:screenshotId")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGameScreenshot(
    @Param("screenshotId", new ParseUUIDPipe()) screenshotId: string,
    @Session() session: UserSession,
  ) {
    await this.gameScreenshotService.deleteGameScreenshot({
      screenshotId,
      userId: session.user.id,
    });
  }
}
