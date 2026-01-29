import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
	Query,
	UseGuards,
	ValidationPipe,
} from "@nestjs/common";
import { RateLimit } from "@/shared/decorators/ratelimit.decorator";
import { AuthGuard } from "@/shared/guards/auth.guard";
import { RateLimitGuard } from "@/shared/guards/ratelimit.guard";
import type { RefreshGameDto } from "./dtos/refresh-game.dto";
import type { SearchGameDto } from "./dtos/search-game.dto";
import type { GameService } from "./game.service";

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller("game")
export class GameController {
	constructor(private readonly gameService: GameService) { }

	@Get('search')
	async searchGames(@Query(new ValidationPipe()) searchGameDto: SearchGameDto) {
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

	@Get('/details/id/:id')
	async getGameById(@Param('id') id: string) {
		const game = await this.gameService.getGameById(id);

		return { game };
	}

	@Get('/details/slug/:slug')
	async getGameBySlug(@Param('slug') slug: string) {
		const game = await this.gameService.getGameBySlug(slug);

		return { game };
	}
}
