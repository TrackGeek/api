import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { CreateMovieReviewDto } from "./dtos/create-movie-review.dto";
import { GetMovieReviewsDto } from "./dtos/get-movie-reviews.dto";
import { MovieReviewService } from "./movie-review.service";

@Controller("/movie/review")
export class MovieReviewController {
  constructor(private readonly movieReviewService: MovieReviewService) {}

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createMovieReview(@Session() session: UserSession, @Body() body: CreateMovieReviewDto) {
    await this.movieReviewService.createMovieReview({
      ...body,
      userId: session.user.id,
    });
  }

  @Get()
  async getMovieReviews(@Query() query: GetMovieReviewsDto) {
    const movieReviews = await this.movieReviewService.getMovieReviews(query);

    return { movieReviews };
  }

  @Get("/:movieReviewId")
  async getMovieReviewById(@Param("movieReviewId", new ParseUUIDPipe()) movieReviewId: string) {
    const movieReview = await this.movieReviewService.getMovieReviewById(movieReviewId);

    return { movieReview };
  }

  @Patch("/:movieReviewId")
  @UseGuards(AuthGuard)
  async updateMovieReview(
    @Param("movieReviewId", new ParseUUIDPipe()) movieReviewId: string,
    @Session() session: UserSession,
    @Body() body: CreateMovieReviewDto,
  ) {
    await this.movieReviewService.updateMovieReview({
      ...body,
      movieReviewId,
      userId: session.user.id,
    });
  }

  @Delete("/:movieReviewId")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMovieReview(
    @Param("movieReviewId", new ParseUUIDPipe()) movieReviewId: string,
    @Session() session: UserSession,
  ) {
    await this.movieReviewService.deleteMovieReview({
      movieReviewId,
      userId: session.user.id,
    });
  }
}
