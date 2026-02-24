import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';

import { TVShowService } from './tv-show.service';
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { SearchTVShowDto } from './dtos/search-tv-show.dto';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RefreshTVShowDto } from './dtos/refresh-tv-show.dto';

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller("tv")
export class TVShowController {
	constructor(private readonly tvShowService: TVShowService) { }

	@Get('search')
	async searchTVShows(@Query() searchTVShowDto: SearchTVShowDto) {
		const tvShows = await this.tvShowService.searchTVShows(searchTVShowDto);

		return { tvShows };
	}
	
	@Post('/refresh')
	@HttpCode(HttpStatus.OK)
	@UseGuards(AuthGuard)
	@UseGuards(RateLimitGuard)
	@RateLimit({ limit: 4, window: 60, blockDuration: 300 })
	async refreshTVShow(@Body() refreshTVShowDto: RefreshTVShowDto) {
		await this.tvShowService.refreshTVShow(refreshTVShowDto);
	}

	@Get('/details/:tvShowId')
	async getTVShowById(@Param('tvShowId', new ParseIntPipe()) tvShowId: number) {
		const tvShow = await this.tvShowService.getTVShowById(tvShowId);

		return { tvShow };
	}
}
