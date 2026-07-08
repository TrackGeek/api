import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { CreateOrUpdateTVShowEpisodeWatchDto } from "../dto/create-or-update-tv-show-episode-watch.dto";
import { DeleteAllTVShowEpisodeWatchDto } from "../dto/delete-all-tv-show-episode-watch.dto";
import { DeleteTVShowEpisodeWatchDto } from "../dto/delete-tv-show-episode-watch.dto";
import { GetTVShowEpisodeWatchDto } from "../dto/get-tv-show-episode-watch.dto";
import { WatchAllEpisodesOfTVShowDto } from "../dto/watch-all-episodes-of-tv-show.dto";
import { TVShowEpisodeWatchService } from "../service/tv-show-episode-watch.service";

@ApiTags("TV Show")
@Controller("/tv/episode/watch")
export class TVShowEpisodeWatchController {
  constructor(private readonly tvShowEpisodeWatchService: TVShowEpisodeWatchService) {}

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createOrUpdateTVShowEpisodeWatch(
    @Session() session: UserSession,
    @Body() body: CreateOrUpdateTVShowEpisodeWatchDto,
  ) {
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

    return { tvShowEpisodeWatch };
  }

  @Delete("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTVShowEpisodeWatch(@Session() session: UserSession, @Body() body: DeleteTVShowEpisodeWatchDto) {
    await this.tvShowEpisodeWatchService.deleteTVShowEpisodeWatch({
      ...body,
      userId: session.user.id,
    });
  }

  @Delete("/all")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAllTVShowEpisodeWatch(@Session() session: UserSession, @Body() body: DeleteAllTVShowEpisodeWatchDto) {
    await this.tvShowEpisodeWatchService.deleteAllTVShowEpisodeWatch({
      ...body,
      userId: session.user.id,
    });
  }
}
