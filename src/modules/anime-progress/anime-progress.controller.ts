import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { AnimeProgressService } from "./anime-progress.service";
import { CreateOrUpdateAnimeProgressDto } from "./dtos/create-or-update-anime-progress.dto";
import { GetAnimeProgressesByUserIdDto } from './dtos/get-anime-progresses-by-user-id.dto';

@Controller("anime/progress")
export class AnimeProgressController {
  constructor(private readonly animeProgressService: AnimeProgressService) {}

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async createOrUpdateAnimeProgress(@Session() session: UserSession, @Body() body: CreateOrUpdateAnimeProgressDto) {
    await this.animeProgressService.createOrUpdateAnimeProgress({
      ...body,
      userId: session.user.id,
    });
  }
  
  @Get()
  async getAnimeProgressesByUserId(@Query() query: GetAnimeProgressesByUserIdDto) {
    const animeProgresses = await this.animeProgressService.getAnimeProgressesByUserId(query);

    return { animeProgresses };
  }
  
  @Get("/:animeProgressId")
  async getAnimeProgressById(@Param("animeProgressId", new ParseUUIDPipe()) animeProgressId: string) {
    const animeProgress = await this.animeProgressService.getAnimeProgressById(animeProgressId);

    return { animeProgress };
  }
}
