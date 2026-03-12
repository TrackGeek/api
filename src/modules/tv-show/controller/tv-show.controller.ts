import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { TopTvShowDto } from "@/modules/tv-show/dto/top-tv-show";
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
    const seasons = await this.tvShowService.getTVShowSeasonsByTmdbId(tmdbId);

    return { seasons };
  }
}
