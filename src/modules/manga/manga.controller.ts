import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { RefreshMangaDto } from "./dtos/refresh-manga.dto";
import { SearchMangaDto } from "./dtos/search-manga.dto";
import { MangaService } from "./manga.service";

@Controller("/manga")
export class MangaController {
  constructor(private readonly mangaService: MangaService) {}

  @Get("/search")
  async searchMangas(@Query() query: SearchMangaDto) {
    const mangas = await this.mangaService.searchMangas(query);

    return { mangas };
  }

  @Post("/refresh")
  @UseGuards(AuthGuard)
  async refreshManga(@Body() refreshMangaDto: RefreshMangaDto) {
    await this.mangaService.refreshManga(refreshMangaDto);
  }

  @Get("/details/:mangaId")
  async getMangaById(@Param("mangaId", new ParseIntPipe()) mangaId: number) {
    const manga = await this.mangaService.getMangaById(mangaId);

    return { manga };
  }
}
