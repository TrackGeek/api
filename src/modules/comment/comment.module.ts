import { Module } from "@nestjs/common";

import { CommentService } from "./comment.service";
import { CommentController } from "./comment.controller";
import { UserModule } from '../user/user.module';

@Module({
	imports: [UserModule],
	controllers: [CommentController],
	providers: [CommentService],
	exports: [CommentService],
})
export class CommentModule {}
