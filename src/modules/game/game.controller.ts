import { Controller, Get, HttpCode, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller('game')
export class GameController {
	constructor(private readonly gameService: GameService) {}

	@Get('search')
	async searchGames(@Query('q') query: string) {
		const games = await this.gameService.searchGames(query);
    
		return { games };
	}
	
	@Get('/details/:slug')
	async getGame(@Param('slug') slug: string) {
		const game = await this.gameService.getGame(slug);
		
		return { game };
	}
	
	@Get('/refresh/:slug')
	@HttpCode(HttpStatus.OK)
	@UseGuards(AuthGuard)
	@UseGuards(RateLimitGuard)
	@RateLimit({ limit: 4, window: 60, blockDuration: 300 })
	async refreshGame(@Param('slug') slug: string) {
		await this.gameService.refreshGame(slug);
	}
}
