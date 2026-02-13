import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';

import { GameService } from './game.service';
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { RefreshGameDto } from './dtos/refresh-game.dto';
import { SearchGameDto } from './dtos/search-game.dto';

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller("game")
export class GameController {
	constructor(private readonly gameService: GameService) { }

	@Get('search')
	async searchGames(@Query() searchGameDto: SearchGameDto) {
		const games = await this.gameService.searchGames(searchGameDto);

		return { games };
	}

	@Post('/refresh')
	@HttpCode(HttpStatus.OK)
	@UseGuards(AuthGuard)
	@UseGuards(RateLimitGuard)
	@RateLimit({ limit: 4, window: 60, blockDuration: 300 })
	async refreshGame(@Body() refreshGameDto: RefreshGameDto) {
		await this.gameService.refreshGame(refreshGameDto);
	}

	@Get('/details/:id')
	async getGameById(@Param('id') id: number) {
		const game = await this.gameService.getGameById(id);

		return { game };
	}
}
