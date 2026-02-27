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
import { CreateMangaReviewDto } from "./dtos/create-manga-review.dto";
import { GetMangaReviewsDto } from "./dtos/get-manga-reviews.dto";
import { UpdateMangaReviewDto } from "./dtos/update-manga-review.dto";
import { MangaReviewService } from "./manga-review.service";

@Controller("manga/review")
export class MangaReviewController {
  constructor(private readonly mangaReviewService: MangaReviewService) {}

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createMangaReview(@Session() session: UserSession, @Body() body: CreateMangaReviewDto) {
    await this.mangaReviewService.createMangaReview({
      ...body,
      userId: session.user.id,
    });
  }

  @Get()
  async getMangaReviews(@Query() query: GetMangaReviewsDto) {
    const mangaReviews = await this.mangaReviewService.getMangaReviews(query);

    return { mangaReviews };
  }

  @Get("/:mangaReviewId")
  async getMangaReviewById(@Param("mangaReviewId", new ParseUUIDPipe()) mangaReviewId: string) {
    const mangaReview = await this.mangaReviewService.getMangaReviewById(mangaReviewId);

    return { mangaReview };
  }

  @Patch("/:mangaReviewId")
  @UseGuards(AuthGuard)
  async updateMangaReview(
    @Param("mangaReviewId", new ParseUUIDPipe()) mangaReviewId: string,
    @Session() session: UserSession,
    @Body() body: UpdateMangaReviewDto,
  ) {
    await this.mangaReviewService.updateMangaReview({
      ...body,
      mangaReviewId,
      userId: session.user.id,
    });
  }

  @Delete("/:mangaReviewId")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMangaReview(
    @Param("mangaReviewId", new ParseUUIDPipe()) mangaReviewId: string,
    @Session() session: UserSession,
  ) {
    await this.mangaReviewService.deleteMangaReview({
      mangaReviewId,
      userId: session.user.id,
    });
  }
}
