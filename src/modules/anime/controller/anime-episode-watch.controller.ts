import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { CreateOrUpdateAnimeEpisodeWatchDto } from "../dto/create-or-update-anime-episode-watch.dto";
import { DeleteAllAnimeEpisodeWatchDto } from "../dto/delete-all-anime-episode-watch.dto";
import { DeleteAnimeEpisodeWatchDto } from "../dto/delete-anime-episode-watch.dto";
import { GetAnimeEpisodeWatchDto } from "../dto/get-anime-episode-watch.dto";
import { WatchAllAnimeEpisodesDto } from "../dto/watch-all-anime-episodes.dto";
import { AnimeEpisodeWatchService } from "../service/anime-episode-watch.service";

@ApiTags("Anime")
@Controller("/anime/episode/watch")
export class AnimeEpisodeWatchController {
  constructor(private readonly animeEpisodeWatchService: AnimeEpisodeWatchService) {}

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createOrUpdateAnimeEpisodeWatch(
    @Session() session: UserSession,
    @Body() body: CreateOrUpdateAnimeEpisodeWatchDto,
  ) {
    await this.animeEpisodeWatchService.createOrUpdateAnimeEpisodeWatch({
      ...body,
      userId: session.user.id,
    });
  }

  @Post("/all")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async watchAllAnimeEpisodes(@Session() session: UserSession, @Body() body: WatchAllAnimeEpisodesDto) {
    await this.animeEpisodeWatchService.watchAllAnimeEpisodes({
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

    return { animeEpisodeWatch };
  }

  @Delete("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAnimeEpisodeWatch(@Session() session: UserSession, @Body() body: DeleteAnimeEpisodeWatchDto) {
    await this.animeEpisodeWatchService.deleteAnimeEpisodeWatch({
      ...body,
      userId: session.user.id,
    });
  }

  @Delete("/all")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAllAnimeEpisodeWatch(@Session() session: UserSession, @Body() body: DeleteAllAnimeEpisodeWatchDto) {
    await this.animeEpisodeWatchService.deleteAllAnimeEpisodeWatch({
      ...body,
      userId: session.user.id,
    });
  }
}
