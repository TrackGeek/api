import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { TopTvShowDto } from "@/modules/tv-show/dto/top-tv-show.dto";
import { RefreshTVShowDto } from "../dto/refresh-tv-show.dto";
import { SearchTVShowDto } from "../dto/search-tv-show.dto";
import { TVShowService } from "../service/tv-show.service";

@ApiTags("TV Show")
@Controller("/tv")
export class TVShowController {
  constructor(private readonly tvShowService: TVShowService) {}

  @Get("/search")
  async searchTVShows(@Query() query: SearchTVShowDto) {
    const tvShows = await this.tvShowService.searchTVShows(query);

    return { tvShows };
  }

  @Get("/filter")
  async tvShowFilters() {
    const filters = await this.tvShowService.tvShowFilters();

    return { filters };
  }

  @Get("/top")
  async topTVShows(@Query() query: TopTvShowDto) {
    const topTVShows = await this.tvShowService.topTVShows(query);

    return { topTVShows };
  }

  @Post("/refresh")
  @UseGuards(AuthGuard)
  async refreshTVShow(@Body() body: RefreshTVShowDto) {
    await this.tvShowService.refreshTVShow(body);
  }

  @Get("/detail/:tmdbId")
  async getTVShowByTmdbId(@Param("tmdbId", new ParseIntPipe()) tmdbId: number) {
    const tvShow = await this.tvShowService.getTVShowByTmdbId(tmdbId);

    return { tvShow };
  }

  @Get("/detail/:tmdbId/season")
  async getTVShowSeasonsByTmdbId(@Param("tmdbId", new ParseIntPipe()) tmdbId: number) {
    const seasons = await this.tvShowService.getTVShowSeasons(tmdbId);

    return { seasons };
  }

  @Get("/detail/:tmdbId/season/:seasonNumber/episode")
  async getTVShowSeasonEpisodes(
    @Param("tmdbId", new ParseIntPipe()) tmdbId: number,
    @Param("seasonNumber", new ParseIntPipe()) seasonNumber: number,
  ) {
    const episodes = await this.tvShowService.getTVShowSeasonEpisodes(tmdbId, seasonNumber);

    return { episodes };
  }

  @Delete("/tracking/:tvShowId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  async resetTVShowTracking(
    @Param("tvShowId", new ParseUUIDPipe()) tvShowId: string,
    @Session() session: UserSession,
  ) {
    await this.tvShowService.resetTVShowTracking({ tvShowId, userId: session.user.id });
  }
}
