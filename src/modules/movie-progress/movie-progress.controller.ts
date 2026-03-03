import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { MovieProgressService } from "./movie-progress.service";
import { CreateOrUpdateMovieProgressDto } from "./dtos/create-or-update-movie-progress.dto";
import { GetMovieProgressesByUserIdDto } from './dtos/get-movie-progresses-by-user-id.dto';

@Controller("movie/progress")
export class MovieProgressController {
  constructor(private readonly movieProgressService: MovieProgressService) {}

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async createOrUpdateMovieProgress(@Session() session: UserSession, @Body() body: CreateOrUpdateMovieProgressDto) {
    await this.movieProgressService.createOrUpdateMovieProgress({
      ...body,
      userId: session.user.id,
    });
  }
  
  @Get()
  async getMovieProgressesByUserId(@Query() query: GetMovieProgressesByUserIdDto) {
    const movieProgresses = await this.movieProgressService.getMovieProgressesByUserId(query);

    return { movieProgresses };
  }
  
  @Get("/:movieProgressId")
  async getMovieProgressById(@Param("movieProgressId", new ParseUUIDPipe()) movieProgressId: string) {
    const movieProgress = await this.movieProgressService.getMovieProgressById(movieProgressId);

    return { movieProgress };
  }
}
