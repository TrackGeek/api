import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { RefreshMovieDto } from "./dtos/refresh-movie.dto";
import { SearchMovieDto } from "./dtos/search-movie.dto";
import { MovieService } from "./movie.service";

@Controller("/movie")
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  @Get("/search")
  async searchMovies(@Query() searchMovieDto: SearchMovieDto) {
    const movies = await this.movieService.searchMovies(searchMovieDto);

    return { movies };
  }

  @Post("/refresh")
  @UseGuards(AuthGuard)
  async refreshMovie(@Body() refreshMovieDto: RefreshMovieDto) {
    await this.movieService.refreshMovie(refreshMovieDto);
  }

  @Get("/details/:movieId")
  async getMovieById(@Param("movieId", new ParseIntPipe()) movieId: number) {
    const movie = await this.movieService.getMovieById(movieId);

    return { movie };
  }
}
