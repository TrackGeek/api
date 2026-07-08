import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { CreateOrUpdateMovieProgressDto } from "../dto/create-or-update-movie-progress.dto";
import { GetMovieProgressDto } from "../dto/get-movie-progress.dto";
import { MovieProgressService } from "../service/movie-progress.service";

@ApiTags("Movie")
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

  @Delete("/:movieProgressId")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMovieProgress(@Session() session: UserSession, @Param("movieProgressId") movieProgressId: string) {
    await this.movieProgressService.deleteMovieProgress(movieProgressId, session.user.id);
  }

  @Get("/")
  async getMovieProgress(@Query() query: GetMovieProgressDto) {
    const movieProgresses = await this.movieProgressService.getMovieProgress(query);

    return { movieProgresses };
  }
}
