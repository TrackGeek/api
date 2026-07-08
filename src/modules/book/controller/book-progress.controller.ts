import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { CreateOrUpdateBookProgressDto } from "../dto/create-or-update-book-progress.dto";
import { GetBookProgressDto } from "../dto/get-book-progress.dto";
import { BookProgressService } from "../service/book-progress.service";

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

  @Delete("/:bookProgressId")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBookProgress(@Session() session: UserSession, @Param("bookProgressId") bookProgressId: string) {
    await this.bookProgressService.deleteBookProgress(bookProgressId, session.user.id);
  }

  @Get("/")
  async getBookProgress(@Query() query: GetBookProgressDto) {
    const bookProgresses = await this.bookProgressService.getBookProgress(query);

    return { bookProgresses };
  }
}
