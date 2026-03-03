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
import { CreateTVShowReviewDto } from "./dtos/create-tv-show-review.dto";
import { GetTVShowReviewsDto } from "./dtos/get-tv-show-reviews.dto";
import { UpdateTVShowReviewDto } from "./dtos/update-tv-show-review.dto";
import { TVShowReviewService } from "./tv-show-review.service";

@Controller("/tv/review")
export class TVShowReviewController {
  constructor(private readonly tvShowReviewService: TVShowReviewService) {}

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createTVShowReview(@Session() session: UserSession, @Body() body: CreateTVShowReviewDto) {
    await this.tvShowReviewService.createTVShowReview({
      ...body,
      userId: session.user.id,
    });
  }

  @Get()
  async getTVShowReviews(@Query() query: GetTVShowReviewsDto) {
    const tvShowReviews = await this.tvShowReviewService.getTVShowReviews(query);

    return { tvShowReviews };
  }

  @Get("/:tvShowReviewId")
  async getTVShowReviewById(@Param("tvShowReviewId", new ParseUUIDPipe()) tvShowReviewId: string) {
    const tvShowReview = await this.tvShowReviewService.getTVShowReviewById(tvShowReviewId);

    return { tvShowReview };
  }

  @Patch("/:tvShowReviewId")
  @UseGuards(AuthGuard)
  async updateTVShowReview(
    @Param("tvShowReviewId", new ParseUUIDPipe()) tvShowReviewId: string,
    @Session() session: UserSession,
    @Body() body: UpdateTVShowReviewDto,
  ) {
    await this.tvShowReviewService.updateTVShowReview({
      ...body,
      tvShowReviewId,
      userId: session.user.id,
    });
  }

  @Delete("/:tvShowReviewId")
  @UseGuards(AuthGuard)
  async deleteTVShowReview(
    @Param("tvShowReviewId", new ParseUUIDPipe()) tvShowReviewId: string,
    @Session() session: UserSession,
  ) {
    await this.tvShowReviewService.deleteTVShowReview({
      tvShowReviewId,
      userId: session.user.id,
    });
  }
}
