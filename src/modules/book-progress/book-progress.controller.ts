import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { BookProgressService } from "./book-progress.service";
import { CreateOrUpdateBookProgressDto } from "./dtos/create-or-update-book-progress.dto";
import { GetBookProgressDto } from './dtos/get-book-progress.dto';

@Controller("/book/progress")
export class BookProgressController {
  constructor(private readonly bookProgressService: BookProgressService) {}

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async createOrUpdateBookProgress(@Session() session: UserSession, @Body() body: CreateOrUpdateBookProgressDto) {
    await this.bookProgressService.createOrUpdateBookProgress({
      ...body,
      userId: session.user.id,
    });
  }
  
  @Get("/")
  async getBookProgress(@Query() query: GetBookProgressDto) {
    const bookProgresses = await this.bookProgressService.getBookProgress(query);

    return { bookProgresses };
  }
}
