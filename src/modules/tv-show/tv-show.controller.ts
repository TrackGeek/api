import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { RefreshTVShowDto } from "./dtos/refresh-tv-show.dto";
import { SearchTVShowDto } from "./dtos/search-tv-show.dto";
import { TVShowService } from "./tv-show.service";

@Controller("/tv")
export class TVShowController {
  constructor(private readonly tvShowService: TVShowService) {}

  @Get("/search")
  async searchTVShows(@Query() query: SearchTVShowDto) {
    const tvShows = await this.tvShowService.searchTVShows(query);

    return { tvShows };
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
