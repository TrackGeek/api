import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { GetProgressFiltersDto } from "@/shared/media-filter/dtos/get-progress-filters.dto";
import { CreateOrUpdateMangaProgressDto } from "../dto/create-or-update-manga-progress.dto";
import { GetMangaProgressDto } from "../dto/get-manga-progressesdto";
import { MangaProgressService } from "../service/manga-progress.service";

@ApiTags("Manga")
@Controller("/manga/progress")
export class MangaProgressController {
  constructor(private readonly mangaProgressService: MangaProgressService) {}

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async createOrUpdateMangaProgress(@Session() session: UserSession, @Body() body: CreateOrUpdateMangaProgressDto) {
    await this.mangaProgressService.createOrUpdateMangaProgress({
      ...body,
      userId: session.user.id,
    });
  }

  @Delete("/:mangaProgressId")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMangaProgress(@Session() session: UserSession, @Param("mangaProgressId") mangaProgressId: string) {
    await this.mangaProgressService.deleteMangaProgress(mangaProgressId, session.user.id);
  }

  @Get("/filters")
  async getMangaProgressFilters(@Query() query: GetProgressFiltersDto) {
    const filters = await this.mangaProgressService.getMangaProgressFilters(query.userId);

    return { filters };
  }

  @Get("/")
  async getMangaProgress(@Query() query: GetMangaProgressDto) {
    return this.mangaProgressService.getMangaProgress(query);
  }
}
