import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { BookService } from "./book.service";
import { RefreshBookDto } from "./dtos/refresh-book.dto";
import { SearchBookDto } from "./dtos/search-book.dto";

@Controller("/book")
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Get("/search")
  async searchBooks(@Query() query: SearchBookDto) {
    const books = await this.bookService.searchBooks(query);

    return { books };
  }

  @Post("/refresh")
  @UseGuards(AuthGuard)
  async refreshBook(@Body() body: RefreshBookDto) {
    await this.bookService.refreshBook(body);
  }

  @Get("/detail/:hardcoverId")
  async getBookByHardcoverId(@Param("hardcoverId", new ParseIntPipe()) hardcoverId: number) {
    const book = await this.bookService.getBookByHardcoverId(hardcoverId);

    return { book };
  }
}
