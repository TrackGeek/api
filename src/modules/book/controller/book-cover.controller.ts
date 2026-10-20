import { Body, Controller, Delete, HttpCode, HttpStatus, Param, ParseIntPipe, Put, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { UpdateBookCoverDto } from "../dto/update-book-cover.dto";
import { BookCoverService } from "../service/book-cover.service";

@ApiTags("Book")
@Controller("/book/cover")
@UseGuards(AuthGuard)
export class BookCoverController {
  constructor(private readonly bookCoverService: BookCoverService) {}

  @Put("/:hardcoverId")
  async setCover(
    @Session() session: UserSession,
    @Param("hardcoverId", ParseIntPipe) hardcoverId: number,
    @Body() body: UpdateBookCoverDto,
  ) {
    const cover = await this.bookCoverService.setCover(session.user.id, hardcoverId, body.editionId);
    return { cover };
  }

  @Delete("/:hardcoverId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetCover(@Session() session: UserSession, @Param("hardcoverId", ParseIntPipe) hardcoverId: number) {
    await this.bookCoverService.resetCover(session.user.id, hardcoverId);
  }
}
