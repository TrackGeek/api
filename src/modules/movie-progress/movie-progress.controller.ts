import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { MovieProgressService } from "./movie-progress.service";
import { CreateOrUpdateMovieProgressDto } from "./dtos/create-or-update-movie-progress.dto";
import { GetMovieProgressDto } from './dtos/get-movie-progress.dto';

@Controller("/movie/progress")
export class MovieProgressController {
  constructor(private readonly movieProgressService: MovieProgressService) {}

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async createOrUpdateMovieProgress(@Session() session: UserSession, @Body() body: CreateOrUpdateMovieProgressDto) {
    await this.movieProgressService.createOrUpdateMovieProgress({
      ...body,
      userId: session.user.id,
    });
  }
  
  @Get("/")
  async getMovieProgress(@Query() query: GetMovieProgressDto) {
    const movieProgresses = await this.movieProgressService.getMovieProgress(query);

    return { movieProgresses };
  }
}
