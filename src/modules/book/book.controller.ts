import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';

import { BookService } from './book.service';
import { RateLimitGuard } from '@/shared/guards/ratelimit.guard';
import { RateLimit } from '@/shared/decorators/ratelimit.decorator';
import { RefreshBookDto } from './dtos/refresh-book.dto';
import { SearchBookDto } from './dtos/search-book.dto';

@UseGuards(RateLimitGuard)
@RateLimit({ limit: 30, window: 60, blockDuration: 300 })
@Controller("book")
export class BookController {
	constructor(private readonly bookService: BookService) { }

	@Get('search')
	async searchBooks(@Query() searchBookDto: SearchBookDto) {
		const books = await this.bookService.searchBooks(searchBookDto);

		return { books };
	}

	@Post('/refresh')
	@HttpCode(HttpStatus.OK)
	@UseGuards(AuthGuard)
	@UseGuards(RateLimitGuard)
	@RateLimit({ limit: 4, window: 60, blockDuration: 300 })
	async refreshBook(@Body() refreshBookDto: RefreshBookDto) {
		await this.bookService.refreshBook(refreshBookDto);
	}

	@Get('/details/:bookId')
	async getBookById(@Param('bookId', new ParseIntPipe()) bookId: number) {
		const book = await this.bookService.getBookById(bookId);

		return { book };
	}
}
