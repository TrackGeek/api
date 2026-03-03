import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { BookProgressService } from "./book-progress.service";
import { CreateOrUpdateBookProgressDto } from "./dtos/create-or-update-book-progress.dto";
import { GetBookProgressesByUserIdDto } from './dtos/get-book-progresses-by-user-id.dto';

@Controller("book/progress")
export class BookProgressController {
  constructor(private readonly bookProgressService: BookProgressService) {}

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async createOrUpdateBookProgress(@Session() session: UserSession, @Body() body: CreateOrUpdateBookProgressDto) {
    await this.bookProgressService.createOrUpdateBookProgress({
      ...body,
      userId: session.user.id,
    });
  }
  
  @Get()
  async getBookProgressesByUserId(@Query() query: GetBookProgressesByUserIdDto) {
    const bookProgresses = await this.bookProgressService.getBookProgressesByUserId(query);

    return { bookProgresses };
  }
  
  @Get("/:bookProgressId")
  async getBookProgressById(@Param("bookProgressId", new ParseUUIDPipe()) bookProgressId: string) {
    const bookProgress = await this.bookProgressService.getBookProgressById(bookProgressId);

    return { bookProgress };
  }
}
