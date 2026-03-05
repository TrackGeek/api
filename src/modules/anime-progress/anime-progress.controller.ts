import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { AnimeProgressService } from "./anime-progress.service";
import { CreateOrUpdateAnimeProgressDto } from "./dtos/create-or-update-anime-progress.dto";
import { GetAnimeProgressDto } from './dtos/get-anime-progress.dto';

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
  
  @Get("/")
  async getAnimeProgress(@Query() query: GetAnimeProgressDto) {
    const animeProgresses = await this.animeProgressService.getAnimeProgress(query);

    return { animeProgresses };
  }
}
