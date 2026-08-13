import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { TopMovieDto } from "@/modules/movie/dto/top-movie.dto";
import { GetMovieWatchProvidersDto } from "../dto/get-movie-watch-providers.dto";
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

  @Get("/watch/provider/region")
  async getWatchProviderRegions() {
    const regions = await this.movieService.getWatchProviderRegions();

    return { regions };
  }

  @Get("/detail/:movieId")
  async getMovieById(@Param("movieId", new ParseIntPipe()) movieId: number) {
    const movie = await this.movieService.getMovieByTmdbId(movieId);

    return { movie };
  }

  @Get("/detail/:movieId/watch/provider")
  async getMovieWatchProviders(
    @Param("movieId", new ParseIntPipe()) movieId: number,
    @Query() query: GetMovieWatchProvidersDto,
  ) {
    const watchProviders = await this.movieService.getMovieWatchProviders(movieId, query);

    return { watchProviders };
  }

  @Get("/franchise/:slug")
  async getMovieFranchise(@Param("slug") slug: string) {
    const franchise = await this.movieService.getMovieFranchise(slug);

    return { franchise };
  }
}
