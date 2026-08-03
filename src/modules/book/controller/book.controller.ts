import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { TopBookDto } from "@/modules/book/dto/top-book.dto";
import { RefreshBookDto } from "../dto/refresh-book.dto";
import { SearchBookDto } from "../dto/search-book.dto";
import { BookService } from "../service/book.service";

@ApiTags("Book")
@Controller("/book")
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Get("/search")
  async searchBooks(@Query() query: SearchBookDto) {
    const books = await this.bookService.searchBooks(query);

    return { books };
  }

  @Get("/filter")
  async bookFilters() {
    const filters = await this.bookService.bookFilters();

    return { filters };
  }

  @Get("/top")
  async topBooks(@Query() query: TopBookDto) {
    const topBooks = await this.bookService.topBooks(query);

    return { topBooks };
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

  @Get("/franchise/:slug")
  async getBookFranchise(@Param("slug") slug: string) {
    const franchise = await this.bookService.getBookFranchise(slug);

    return { franchise };
  }
}
