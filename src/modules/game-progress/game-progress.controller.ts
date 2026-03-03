import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { GameProgressService } from "./game-progress.service";
import { CreateOrUpdateGameProgressDto } from "./dtos/create-or-update-game-progress.dto";
import { GetGameProgressDto } from './dtos/get-game-progress.dto';

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
  
  @Get("/")
  async getGameProgress(@Query() query: GetGameProgressDto) {
    const gameProgresses = await this.gameProgressService.getGameProgress(query);

    return { gameProgresses };
  }
}
