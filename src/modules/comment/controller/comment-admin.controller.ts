import { Controller, Delete, HttpCode, HttpStatus, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/generated/enums";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { Roles } from "@/shared/decorators/roles.decorator";
import { RolesGuard } from "@/shared/guards/roles.guard";
import { CommentService } from "../service/comment.service";

@ApiTags("Comment")
@Controller("/admin/comments")
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Administrator)
export class CommentAdminController {
  constructor(private readonly commentService: CommentService) {}

  @Delete("/:commentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(@Param("commentId", new ParseUUIDPipe()) commentId: string) {
    await this.commentService.adminDeleteComment(commentId);
  }
}
