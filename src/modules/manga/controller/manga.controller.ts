import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { RefreshMangaDto } from "../dto/refresh-manga.dto";
import { SearchMangaDto } from "../dto/search-manga.dto";
import { MangaService } from "../service/manga.service";
import { ApiTags } from "@nestjs/swagger";
import { MangaRecommendationsDto } from "../dto/manga-recommendations.dto";
import { TopMangaDto } from "../dto/top-manga.dto";

@ApiTags("Manga")
@Controller("/manga")
export class MangaController {
  constructor(private readonly mangaService: MangaService) {}

  @Get("/search")
  async searchMangas(@Query() query: SearchMangaDto) {
    const mangas = await this.mangaService.searchMangas(query);

    return { mangas };
  }

  @Get("/filter")
  async mangaFilters() {
    const filters = await this.mangaService.mangaFilters();

    return { filters };
  }

  @Get("/top")
  async topMangas(@Query() query: TopMangaDto) {
    const mangas = await this.mangaService.topMangas(query);

    return { mangas };
  }

  @Get("/recommendation")
  async mangaRecommendations(@Query() query: MangaRecommendationsDto) {
    const mangas = await this.mangaService.mangaRecommendations(query);

    return { mangas };
  }

  @Post("/refresh")
  @UseGuards(AuthGuard)
  async refreshManga(@Body() refreshMangaDto: RefreshMangaDto) {
    await this.mangaService.refreshManga(refreshMangaDto);
  }

  @Get("/detail/:malId")
  async getMangaByMalId(@Param("malId", new ParseIntPipe()) malId: number) {
    const manga = await this.mangaService.getMangaByMalId(malId);

    return { manga };
  }
}
