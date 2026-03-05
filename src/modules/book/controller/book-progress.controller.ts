import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { BookProgressService } from "../service/book-progress.service";
import { CreateOrUpdateBookProgressDto } from "../dto/create-or-update-book-progress.dto";
import { GetBookProgressDto } from "../dto/get-book-progress.dto";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("Book")
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
