import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { CommentService } from "../service/comment.service";
import { CreateCommentDto } from "../dto/create-comment.dto";
import { GetCommentsDto } from "../dto/get-comments.dto";
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Comment')
@Controller("/comment")
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post("/")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addCommentToProfile(@Session() session: UserSession, @Body() body: CreateCommentDto) {
    await this.commentService.createComment({
      ...body,
      userId: session.user.id,
    });
  }

  @Get("/")
  async getComments(@Query() body: GetCommentsDto) {
    const comments = await this.commentService.getComments(body);

    return { comments };
  }

  @Delete("/:commentId")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(@Session() session: UserSession, @Param("commentId", new ParseUUIDPipe()) commentId: string) {
    await this.commentService.deleteComment({
      commentId,
      userId: session.user.id,
    });
  }
}
