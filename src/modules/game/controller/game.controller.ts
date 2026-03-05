import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { RefreshGameDto } from "../dto/refresh-game.dto";
import { SearchGameDto } from "../dto/search-game.dto";
import { GameService } from "../service/game.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("Game")
@Controller("/game")
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get("/search")
  async searchGames(@Query() query: SearchGameDto) {
    const games = await this.gameService.searchGames(query);

    return { games };
  }

  @Post("/refresh")
  @UseGuards(AuthGuard)
  async refreshGame(@Body() body: RefreshGameDto) {
    await this.gameService.refreshGame(body);
  }

  @Get("/detail/:igdbId")
  async getGameByIgdbId(@Param("igdbId", new ParseIntPipe()) igdbId: number) {
    const game = await this.gameService.getGameByIgdbId(igdbId);

    return { game };
  }
}
