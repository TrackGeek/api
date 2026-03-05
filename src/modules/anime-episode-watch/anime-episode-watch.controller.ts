import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { CreateOrUpdateAnimeEpisodeWatchDto } from "./dtos/create-or-update-anime-episode-watch.dto";
import { AnimeEpisodeWatchService } from "./anime-episode-watch.service";
import { GetAnimeEpisodeWatchDto } from "./dtos/get-anime-episode-watch.dto";
import { WatchAllEpisodesOfAnimeDto } from "./dtos/watch-all-episodes-of-anime.dto";

@Controller("/anime/episode/watch")
export class AnimeEpisodeWatchController {
  constructor(private readonly animeEpisodeWatchService: AnimeEpisodeWatchService) {}

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createAnimeEpisodeWatch(@Session() session: UserSession, @Body() body: CreateOrUpdateAnimeEpisodeWatchDto) {
    await this.animeEpisodeWatchService.createOrUpdateAnimeEpisodeWatch({
      ...body,
      userId: session.user.id,
    });
  }

  @Post("/all")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async watchAllEpisodesOfAnime(@Session() session: UserSession, @Body() body: WatchAllEpisodesOfAnimeDto) {
    await this.animeEpisodeWatchService.watchAllEpisodesOfAnime({
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
