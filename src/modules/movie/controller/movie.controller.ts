import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { TopMovieDto } from "@/modules/movie/dto/top-movie.dto";
import { RefreshMovieDto } from "../dto/refresh-movie.dto";
import { SearchMovieDto } from "../dto/search-movie.dto";
import { MovieService } from "../service/movie.service";

@ApiTags("Movie")
@Controller("/movie")
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  @Get("/search")
  async searchMovies(@Query() searchMovieDto: SearchMovieDto) {
    const movies = await this.movieService.searchMovies(searchMovieDto);

    return { movies };
  }

  @Get("/filter")
  async movieFilters() {
    const filters = await this.movieService.movieFilters();

    return { filters };
  }

  @Get("/top")
  async topMovies(@Query() query: TopMovieDto) {
    const movies = await this.movieService.topMovies(query);

    return { movies };
  }

  @Post("/refresh")
  @UseGuards(AuthGuard)
  async refreshMovie(@Body() refreshMovieDto: RefreshMovieDto) {
    await this.movieService.refreshMovie(refreshMovieDto);
  }

  @Get("/detail/:movieId")
  async getMovieById(@Param("movieId", new ParseIntPipe()) movieId: number) {
    const movie = await this.movieService.getMovieByTmdbId(movieId);

    return { movie };
  }
}
