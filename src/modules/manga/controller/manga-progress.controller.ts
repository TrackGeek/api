import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { MangaProgressService } from "../service/manga-progress.service";
import { CreateOrUpdateMangaProgressDto } from "../dto/create-or-update-manga-progress.dto";
import { GetMangaProgressesByUserIdDto } from "../dto/get-manga-progresses-by-user-id.dto";
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Manga')
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
  async getMangaProgressesByUserId(@Query() query: GetMangaProgressesByUserIdDto) {
    const mangaProgresses = await this.mangaProgressService.getMangaProgressesByUserId(query);

    return { mangaProgresses };
  }
}
