import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { GetProgressFiltersDto } from "@/shared/media-filter/dtos/get-progress-filters.dto";
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

  @Get("/filters")
  async getMovieProgressFilters(@Query() query: GetProgressFiltersDto) {
    const filters = await this.movieProgressService.getMovieProgressFilters(query.userId);

    return { filters };
  }

  @Get("/")
  async getMovieProgress(@Query() query: GetMovieProgressDto) {
    return this.movieProgressService.getMovieProgress(query);
  }
}
