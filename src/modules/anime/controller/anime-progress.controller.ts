import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { GetProgressFiltersDto } from "@/shared/media-filter/dtos/get-progress-filters.dto";
import { CreateOrUpdateAnimeProgressDto } from "../dto/create-or-update-anime-progress.dto";
import { GetAnimeProgressDto } from "../dto/get-anime-progress.dto";
import { AnimeProgressService } from "../service/anime-progress.service";

@ApiTags("Anime")
@Controller("/anime/progress")
export class AnimeProgressController {
  constructor(private readonly animeProgressService: AnimeProgressService) {}

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async createOrUpdateAnimeProgress(@Session() session: UserSession, @Body() body: CreateOrUpdateAnimeProgressDto) {
    await this.animeProgressService.createOrUpdateAnimeProgress({
      ...body,
      userId: session.user.id,
    });
  }

  @Delete("/:animeProgressId")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAnimeProgress(@Session() session: UserSession, @Param("animeProgressId") animeProgressId: string) {
    await this.animeProgressService.deleteAnimeProgress(animeProgressId, session.user.id);
  }

  @Get("/filters")
  async getAnimeProgressFilters(@Query() query: GetProgressFiltersDto) {
    const filters = await this.animeProgressService.getAnimeProgressFilters(query.userId);

    return { filters };
  }

  @Get("/")
  async getAnimeProgress(@Query() query: GetAnimeProgressDto) {
    return this.animeProgressService.getAnimeProgress(query);
  }
}
