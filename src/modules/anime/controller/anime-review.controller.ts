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
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { CreateAnimeReviewDto } from "../dto/create-anime-review.dto";
import { GetAnimeReviewsDto } from "../dto/get-anime-reviews.dto";
import { UpdateAnimeReviewDto } from "../dto/update-anime-review.dto";
import { AnimeReviewService } from "../service/anime-review.service";

@ApiTags("Anime")
@Controller("/anime/review")
export class AnimeReviewController {
  constructor(private readonly animeReviewService: AnimeReviewService) {}

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createAnimeReview(@Session() session: UserSession, @Body() body: CreateAnimeReviewDto) {
    await this.animeReviewService.createAnimeReview({
      ...body,
      userId: session.user.id,
    });
  }

  @Get("/")
  async getAnimeReviews(@Query() query: GetAnimeReviewsDto) {
    const animeReviews = await this.animeReviewService.getAnimeReviews(query);

    return { animeReviews };
  }

  @Get("/:animeReviewId")
  async getAnimeReviewById(@Param("animeReviewId", new ParseUUIDPipe()) animeReviewId: string) {
    const animeReview = await this.animeReviewService.getAnimeReviewById(animeReviewId);

    return { animeReview };
  }

  @Patch("/:animeReviewId")
  @UseGuards(AuthGuard)
  async updateAnimeReview(
    @Param("animeReviewId", new ParseUUIDPipe()) animeReviewId: string,
    @Session() session: UserSession,
    @Body() body: UpdateAnimeReviewDto,
  ) {
    await this.animeReviewService.updateAnimeReview({
      ...body,
      animeReviewId,
      userId: session.user.id,
    });
  }

  @Delete("/:animeReviewId")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAnimeReview(
    @Param("animeReviewId", new ParseUUIDPipe()) animeReviewId: string,
    @Session() session: UserSession,
  ) {
    await this.animeReviewService.deleteAnimeReview({
      animeReviewId,
      userId: session.user.id,
    });
  }
}
