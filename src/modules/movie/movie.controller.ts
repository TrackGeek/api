import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { MovieService } from './movie.service';
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { SearchMovieDto } from './dtos/search-movie.dto';

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller("movie")
export class MovieController {
	constructor(private readonly movieService: MovieService) { }

	@Get('search')
	async searchMovies(@Query() searchMovieDto: SearchMovieDto) {
		const movies = await this.movieService.searchMovies(searchMovieDto);

		return { movies };
	}
}
