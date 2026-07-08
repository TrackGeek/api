import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { CreateOrUpdateGameProgressDto } from "../dto/create-or-update-game-progress.dto";
import { GetGameProgressDto } from "../dto/get-game-progress.dto";
import { GameProgressService } from "../service/game-progress.service";

@ApiTags("Game")
@Controller("/game/progress")
export class GameProgressController {
  constructor(private readonly gameProgressService: GameProgressService) {}

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async createOrUpdateGameProgress(@Session() session: UserSession, @Body() body: CreateOrUpdateGameProgressDto) {
    await this.gameProgressService.createOrUpdateGameProgress({
      ...body,
      userId: session.user.id,
    });
  }

  @Delete("/:gameProgressId")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGameProgress(@Session() session: UserSession, @Param("gameProgressId") gameProgressId: string) {
    await this.gameProgressService.deleteGameProgress(gameProgressId, session.user.id);
  }

  @Get("/")
  async getGameProgress(@Query() query: GetGameProgressDto) {
    const gameProgresses = await this.gameProgressService.getGameProgress(query);

    return { gameProgresses };
  }
}
