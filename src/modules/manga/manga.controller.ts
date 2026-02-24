import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';

import { MangaService } from './manga.service';
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { RefreshMangaDto } from './dtos/refresh-manga.dto';
import { SearchMangaDto } from './dtos/search-manga.dto';

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller("manga")
export class MangaController {
	constructor(private readonly mangaService: MangaService) { }

	@Get('search')
	async searchMangas(@Query() searchMangaDto: SearchMangaDto) {
		const mangas = await this.mangaService.searchMangas(searchMangaDto);

		return { mangas };
	}

	@Post('/refresh')
	@HttpCode(HttpStatus.OK)
	@UseGuards(AuthGuard)
	@UseGuards(RateLimitGuard)
	@RateLimit({ limit: 4, window: 60, blockDuration: 300 })
	async refreshManga(@Body() refreshMangaDto: RefreshMangaDto) {
		await this.mangaService.refreshManga(refreshMangaDto);
	}

	@Get('/details/:mangaId')
	async getMangaById(@Param('mangaId', new ParseIntPipe()) mangaId: number) {
		const manga = await this.mangaService.getMangaById(mangaId);

		return { manga };
	}
}
