import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { RefreshGameDto } from "./dtos/refresh-game.dto";
import { SearchGameDto } from "./dtos/search-game.dto";
import { GameService } from "./game.service";

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

  @Get("/details/:gameId")
  async getGameById(@Param("gameId", new ParseIntPipe()) gameId: number) {
    const game = await this.gameService.getGameById(gameId);

    return { game };
  }
}
