import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { GameProgressService } from "./game-progress.service";
import { CreateOrUpdateGameProgressDto } from "./dtos/create-or-update-game-progress.dto";
import { GetGameProgressesByUserIdDto } from './dtos/get-game-progresses-by-user-id.dto';

@Controller("game/progress")
export class GameProgressController {
  constructor(private readonly gameProgressService: GameProgressService) {}

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async createOrUpdateGameProgress(@Session() session: UserSession, @Body() body: CreateOrUpdateGameProgressDto) {
    await this.gameProgressService.createOrUpdateGameProgress({
      ...body,
      userId: session.user.id,
    });
  }
  
  @Get()
  async getGameProgressesByUserId(@Query() query: GetGameProgressesByUserIdDto) {
    const gameProgresses = await this.gameProgressService.getGameProgressesByUserId(query);

    return { gameProgresses };
  }
  
  @Get("/:gameProgressId")
  async getGameProgressById(@Param("gameProgressId", new ParseUUIDPipe()) gameProgressId: string) {
    const gameProgress = await this.gameProgressService.getGameProgressById(gameProgressId);

    return { gameProgress };
  }
}
