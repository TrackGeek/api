import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { AnimeService } from "./anime.service";
import { RefreshAnimeDto } from "./dtos/refresh-anime.dto";
import { SearchAnimeDto } from "./dtos/search-anime.dto";

@Controller("/anime")
export class AnimeController {
  constructor(private readonly animeService: AnimeService) {}

  @Get("/search")
  async searchAnimes(@Query() query: SearchAnimeDto) {
    const animes = await this.animeService.searchAnimes(query);

    return { animes };
  }

  @Post("/refresh")
  @UseGuards(AuthGuard)
  async refreshAnime(@Body() body: RefreshAnimeDto) {
    await this.animeService.refreshAnime(body);
  }

  @Get("/detail/:animeId")
  async getAnimeById(@Param("animeId", new ParseIntPipe()) animeId: number) {
    const anime = await this.animeService.getAnimeById(animeId);

    return { anime };
  }
  
  @Get("/detail/:animeId/episode")
  async getAnimeEpisodesById(@Param("animeId", new ParseIntPipe()) animeId: number) {
    const episodes = await this.animeService.getAnimeEpisodesById(animeId);

    return { episodes };
  }
}
