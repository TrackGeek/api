import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { CreateOrUpdateAnimeEpisodeWatchDto } from "../dto/create-or-update-anime-episode-watch.dto";
import { AnimeEpisodeWatchService } from "../service/anime-episode-watch.service";
import { GetAnimeEpisodeWatchDto } from "../dto/get-anime-episode-watch.dto";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("Anime")
@Controller("/anime/episode/watch")
export class AnimeEpisodeWatchController {
  constructor(private readonly animeEpisodeWatchService: AnimeEpisodeWatchService) {}

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createOrUpdateAnimeEpisodeWatch(@Session() session: UserSession, @Body() body: CreateOrUpdateAnimeEpisodeWatchDto) {
    await this.animeEpisodeWatchService.createOrUpdateAnimeEpisodeWatch({
      ...body,
      userId: session.user.id,
    });
  }

  @Get("/")
  @UseGuards(AuthGuard)
  async getAnimeEpisodeWatch(@Session() session: UserSession, @Query() query: GetAnimeEpisodeWatchDto) {
    const animeEpisodeWatch = await this.animeEpisodeWatchService.getAnimeEpisodeWatch({
      ...query,
      userId: session.user.id,
    });

    return animeEpisodeWatch;
  }
}
