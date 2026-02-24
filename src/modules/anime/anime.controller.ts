import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';

import { AnimeService } from './anime.service';
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { RefreshAnimeDto } from './dtos/refresh-anime.dto';
import { SearchAnimeDto } from './dtos/search-anime.dto';

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller("anime")
export class AnimeController {
	constructor(private readonly animeService: AnimeService) { }

	@Get('search')
	async searchAnimes(@Query() searchAnimeDto: SearchAnimeDto) {
		const animes = await this.animeService.searchAnimes(searchAnimeDto);

		return { animes };
	}

	@Post('/refresh')
	@HttpCode(HttpStatus.OK)
	@UseGuards(AuthGuard)
	@UseGuards(RateLimitGuard)
	@RateLimit({ limit: 4, window: 60, blockDuration: 300 })
	async refreshAnime(@Body() refreshAnimeDto: RefreshAnimeDto) {
		await this.animeService.refreshAnime(refreshAnimeDto);
	}

	@Get('/details/:animeId')
	async getAnimeById(@Param('animeId', new ParseIntPipe()) animeId: number) {
		const anime = await this.animeService.getAnimeById(animeId);

		return { anime };
	}
}
