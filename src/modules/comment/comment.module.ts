import { Module } from "@nestjs/common";
import { CommentController } from "./controller/comment.controller";
import { CommentAdminController } from "./controller/comment-admin.controller";
import { CommentService } from "./service/comment.service";

@Module({
  imports: [],
  controllers: [CommentController, CommentAdminController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
