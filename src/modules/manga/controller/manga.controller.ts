import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { RefreshMangaDto } from "../dto/refresh-manga.dto";
import { SearchMangaDto } from "../dto/search-manga.dto";
import { TopMangaDto } from "../dto/top-manga.dto";
import { MangaService } from "../service/manga.service";

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

  @Post("/refresh")
  @UseGuards(AuthGuard)
  async refreshManga(@Body() refreshMangaDto: RefreshMangaDto) {
    await this.mangaService.refreshManga(refreshMangaDto);
  }

  @Get("/cast/:anilistId")
  async getMangaCastByAnilistId(@Param("anilistId", new ParseIntPipe()) anilistId: number) {
    const person = await this.mangaService.getMangaCastByAnilistId(anilistId);

    return { person };
  }

  @Get("/detail/:anilistId")
  async getMangaByAnilistId(@Param("anilistId", new ParseIntPipe()) anilistId: number) {
    const manga = await this.mangaService.getMangaByAnilistId(anilistId);

    return { manga };
  }

  @Get("/detail/:anilistId/relation")
  async getMangaRelationsByAnilistId(@Param("anilistId", new ParseIntPipe()) anilistId: number) {
    const relations = await this.mangaService.getMangaRelationsByAnilistId(anilistId);

    return { relations };
  }
}
