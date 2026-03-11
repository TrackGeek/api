import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { AnimeService } from "../service/anime.service";
import { RefreshAnimeDto } from "../dto/refresh-anime.dto";
import { SearchAnimeDto } from "../dto/search-anime.dto";
import { ApiTags } from "@nestjs/swagger";
import { AnimeRecommendationsDto } from "../dto/anime-recommendations.dto";
import { TopAnimeDto } from '../dto/top-anime.dto';

@ApiTags("Anime")
@Controller("/anime")
export class AnimeController {
  constructor(private readonly animeService: AnimeService) {}

  @Get("/search")
  async searchAnimes(@Query() query: SearchAnimeDto) {
    const animes = await this.animeService.searchAnimes(query);

    return { animes };
  }

  @Get("/filter")
  async animeFilters() {
    const filters = await this.animeService.animeFilters();

    return { filters };
  }
  
  @Get("/top")
  async topAnimes(@Query() query: TopAnimeDto) {
    const animes = await this.animeService.topAnimes(query);

    return { animes };
  }

  @Get("/recommendation")
  async animeRecommendations(@Query() query: AnimeRecommendationsDto) {
    const animes = await this.animeService.animeRecommendations(query);

    return { animes };
  }

  @Post("/refresh")
  @UseGuards(AuthGuard)
  async refreshAnime(@Body() body: RefreshAnimeDto) {
    await this.animeService.refreshAnime(body);
  }

  @Get("/detail/:malId")
  async getAnimeByMalId(@Param("malId", new ParseIntPipe()) malId: number) {
    const anime = await this.animeService.getAnimeByMalId(malId);

    return { anime };
  }

  @Get("/detail/:malId/episode")
  async getAnimeEpisodesByMalId(@Param("malId", new ParseIntPipe()) malId: number) {
    const episodes = await this.animeService.getAnimeEpisodesByMalId(malId);

    return { episodes };
  }
}
