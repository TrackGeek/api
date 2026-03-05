import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { CreateOrUpdateTVShowEpisodeWatchDto } from "../dto/create-or-update-tv-show-episode-watch.dto";
import { TVShowEpisodeWatchService } from "../service/tv-show-episode-watch.service";
import { GetTVShowEpisodeWatchDto } from "../dto/get-tv-show-episode-watch.dto";
import { WatchAllEpisodesOfTVShowDto } from "../dto/watch-all-episodes-of-tv-show.dto";
import { ApiTags } from '@nestjs/swagger';

@ApiTags('TV Show')
@Controller("/tv/episode/watch")
export class TVShowEpisodeWatchController {
  constructor(private readonly tvShowEpisodeWatchService: TVShowEpisodeWatchService) {}

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createTVShowEpisodeWatch(@Session() session: UserSession, @Body() body: CreateOrUpdateTVShowEpisodeWatchDto) {
    await this.tvShowEpisodeWatchService.createOrUpdateTVShowEpisodeWatch({
      ...body,
      userId: session.user.id,
    });
  }

  @Post("/all")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async watchAllEpisodesOfTVShow(@Session() session: UserSession, @Body() body: WatchAllEpisodesOfTVShowDto) {
    await this.tvShowEpisodeWatchService.watchAllEpisodesOfTVShow({
      ...body,
      userId: session.user.id,
    });
  }

  @Get("/")
  @UseGuards(AuthGuard)
  async getTVShowEpisodeWatch(@Session() session: UserSession, @Query() query: GetTVShowEpisodeWatchDto) {
    const tvShowEpisodeWatch = await this.tvShowEpisodeWatchService.getTVShowEpisodeWatch({
      ...query,
      userId: session.user.id,
    });

    return tvShowEpisodeWatch;
  }
}
