import { Module } from "@nestjs/common";
import { CommentController } from "./controller/comment.controller";
import { CommentService } from "./service/comment.service";

@Module({
  imports: [],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
