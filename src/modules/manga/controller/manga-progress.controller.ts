import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { MangaProgressService } from "../service/manga-progress.service";
import { CreateOrUpdateMangaProgressDto } from "../dto/create-or-update-manga-progress.dto";
import { GetMangaProgressDto } from "../dto/get-manga-progressesdto";
import { ApiTags } from "@nestjs/swagger";

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

  @Get("/")
  async getMangaProgress(@Query() query: GetMangaProgressDto) {
    const mangaProgresses = await this.mangaProgressService.getMangaProgress(query);

    return { mangaProgresses };
  }
}
