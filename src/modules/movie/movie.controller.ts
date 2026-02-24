import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';

import { MovieService } from './movie.service';
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { SearchMovieDto } from './dtos/search-movie.dto';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RefreshMovieDto } from './dtos/refresh-movie.dto';

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
	
	@Post('/refresh')
	@HttpCode(HttpStatus.OK)
	@UseGuards(AuthGuard)
	@UseGuards(RateLimitGuard)
	@RateLimit({ limit: 4, window: 60, blockDuration: 300 })
	async refreshMovie(@Body() refreshMovieDto: RefreshMovieDto) {
		await this.movieService.refreshMovie(refreshMovieDto);
	}

	@Get('/details/:movieId')
	async getMovieById(@Param('movieId', new ParseIntPipe()) movieId: number) {
		const movie = await this.movieService.getMovieById(movieId);

		return { movie };
	}
}
