import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { TVShowService } from './tv-show.service';
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { SearchTVShowDto } from './dtos/search-tv-show.dto';

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
}
