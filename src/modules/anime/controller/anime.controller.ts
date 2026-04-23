import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { RefreshAnimeDto } from "../dto/refresh-anime.dto";
import { SearchAnimeDto } from "../dto/search-anime.dto";
import { TopAnimeDto } from "../dto/top-anime.dto";
import { AnimeService } from "../service/anime.service";
import { GetAnimeEpisodesByMalIdDto } from "../dto/get-anime-episodes-by-mal-id.dto";

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

  @Get("/detail/:malId/relation")
  async getAnimeRelationsByMalId(@Param("malId", new ParseIntPipe()) malId: number) {
    const relations = await this.animeService.getAnimeRelationsByMalId(malId);

    return { relations };
  }

  @Get("/detail/:malId/episode")
  async getAnimeEpisodesByMalId(
    @Param("malId", new ParseIntPipe()) malId: number,
    @Query() query: GetAnimeEpisodesByMalIdDto,
  ) {
    const episodes = await this.animeService.getAnimeEpisodesByMalId({
      ...query,
      malId,
    });

    return { episodes };
  }
}
