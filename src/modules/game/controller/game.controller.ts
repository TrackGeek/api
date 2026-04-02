import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { TopGameDto } from "@/modules/game/dto/top-game.dto";
import { RefreshGameDto } from "../dto/refresh-game.dto";
import { SearchGameDto } from "../dto/search-game.dto";
import { GameService } from "../service/game.service";

@ApiTags("Game")
@Controller("/game")
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get("/search")
  async searchGames(@Query() query: SearchGameDto) {
    const games = await this.gameService.searchGames(query);

    return { games };
  }
  
  @Get("/filter")
  async gameFilters() {
    const filters = await this.gameService.gameFilters();

    return { filters };
  }

  @Get("/top")
  async topGames(@Query() query: TopGameDto) {
    const topGames = await this.gameService.topGames(query);

    return { topGames };
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
